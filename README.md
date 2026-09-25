# 🚀 AutoDocs

> **Enterprise-grade automated documentation system anchored to Git commits.**
> Automatically generates, updates, and serves rich technical documentation whenever code is pushed or merged to your repository—**without ever committing files back to your source code repository**.

---

## 📌 Table of Contents
1. [Overview & Core Principles](#-overview--core-principles)
2. [Architecture Diagram](#-architecture-diagram)
3. [Features](#-features)
4. [GitHub App Setup Guide](#-github-app-setup-guide)
5. [Local Development Setup](#-local-development-setup)
6. [Full vs Incremental Generation Flow](#-full-vs-incremental-generation-flow)
7. [Bootstrapping Your First Documentation](#-bootstrapping-your-first-documentation)
8. [API Reference & Webhooks](#-api-reference--webhooks)
9. [Docker Deployment](#-docker-deployment)
10. [Environment Variables Reference](#-environment-variables-reference)

---

## 🔍 Overview & Core Principles

AutoDocs solves documentation decay by making technical documentation an automated byproduct of standard Git workflows:

- **Zero Git Pollution**: Documentation is **never** committed into your Git repository. Code repositories stay clean, commit histories remain pure, and there are no cyclic CI build loops.
- **Git-Anchored Snapshots**: All documentation versions are immutably tied to a Git commit SHA in a PostgreSQL database via Prisma.
- **Dual Mode Intelligence**:
  - **Full / Bootstrap Mode**: Analyzes repository structure, parses TypeScript ASTs using `ts-morph`, and synthesizes a holistic baseline.
  - **Incremental Update Mode**: Ingests Git commit diffs, inspects AST modifications, generates a clear human-readable changelog, highlights breaking changes, and updates documentation in seconds.
- **Resilient AI Engine**: Built using the Vercel AI SDK with Anthropic Claude 3.5 Sonnet as the primary LLM, backed by automatic fallback to DeepSeek or Ollama local models, and queue-driven retries via BullMQ.

---

## 🏗️ Architecture Diagram

```mermaid
flowchart TD
    subgraph GitHub ["GitHub Cloud"]
        Developer([Developer]) -->|git push origin main| Repo[(GitHub Repository)]
        Repo -->|Webhook: POST /webhooks/github| WebhookHandler[Webhook Endpoint]
    end

    subgraph Backend ["AutoDocs Backend (NestJS 11)"]
        WebhookHandler -->|Verify HMAC SHA-256| HMACValidator{Valid Signature?}
        HMACValidator -->|No| Reject[401 Unauthorized]
        HMACValidator -->|Yes & Branch = main| Enqueue[Enqueue BullMQ Job]
        Enqueue -->|HTTP 200 OK in < 50ms| WebhookAck[Ack GitHub]

        subgraph WorkerPipeline ["BullMQ Worker Pipeline"]
            Queue[(Redis Queue)] --> Worker[Doc Generation Worker]
            Worker --> OctokitAuth[Octokit GitHub App Auth]
            OctokitAuth --> FetchDiff[Fetch Commits & Git Diffs]
            FetchDiff --> AST[ts-morph AST Code Analyzer]
            AST --> LLMEngine[Vercel AI SDK Engine]
            
            LLMEngine -->|Primary| Claude[Claude 3.5 Sonnet]
            LLMEngine -.->|Fallback| DeepSeek[DeepSeek / Ollama]
            
            Claude --> ZodValidate[Zod Schema Validator]
            DeepSeek --> ZodValidate
        end

        WorkerPipeline -->|Upsert DocumentationVersion| Postgres[(PostgreSQL via Prisma)]
    end

    subgraph Frontend ["AutoDocs Live Web (Next.js 15)"]
        User([Reader / Team]) --> WebApp[Docs Portal]
        WebApp -->|GET /api/docs/latest| Postgres
        WebApp -->|GET /api/docs/version/:sha| Postgres
        WebApp --> VersionSelector[Version History & Timeline]
        WebApp --> AdminPanel[Admin Control Dashboard]
    end
```

---

## ✨ Features

- **GitHub App & PAT Support**: Connect securely via official GitHub App installation tokens, or use Personal Access Tokens for rapid local development.
- **Instant Webhook Ingestion**: Webhook events verify HMAC signatures and enqueue background jobs within 50ms.
- **BullMQ Concurrency & Retries**: Exponential backoff retries (3 attempts, 5s delay) and rate-limit friendly queue controls.
- **AST Code Extraction**: Uses `ts-morph` to inspect TypeScript classes, decorators (`@Controller`, `@Injectable`), interfaces, method signatures, and JSDoc comments.
- **Structured JSON + Markdown**: Produces validated JSON (Overview, Architecture, API Endpoints, Database Models, Breaking Changes, Migration Notes) alongside complete standalone Markdown.
- **Interactive Version Selector**: Switch between any historical commit documentation instantaneously.
- **Admin Console**: Trigger full/incremental runs on demand, view execution logs and latencies, and retry failed tasks.

---

## 🔑 GitHub App Setup Guide

AutoDocs communicates with GitHub via an official GitHub App. Follow these steps to register your App:

### 1. Register the GitHub App
1. Go to your GitHub account or organization settings:
   - **Personal**: `https://github.com/settings/apps`
   - **Organization**: `https://github.com/organizations/<YOUR_ORG>/settings/apps`
2. Click **New GitHub App**.
3. Fill in the details:
   - **GitHub App name**: `AutoDocs Engine` (or your preferred unique name)
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Webhook URL**: `https://<YOUR_DOMAIN_OR_SMEE_URL>/webhooks/github`
   - **Webhook secret**: Enter a strong secret (e.g., `autodocs-local-secret`)

### 2. Configure Permissions
Under **Repository permissions**, grant:
- **Contents**: `Read-only` (to inspect files, commits, and git diffs)
- **Metadata**: `Read-only` (default)
- **Pull requests**: `Read-only` (optional, for PR comments if extended)

Under **Subscribe to events**, select:
- ✅ **Push**

### 3. Generate Private Key & Install App
1. Click **Create GitHub App**.
2. Scroll to the bottom and click **Generate a private key**. A `.pem` file will download to your computer.
3. Note your **App ID** displayed at the top of the settings page.
4. On the left sidebar, click **Install App**, select your account/organization, and choose the repositories you want AutoDocs to document.
5. Once installed, copy the numeric **Installation ID** from the URL bar (e.g. `https://github.com/settings/installations/12345678`).

### 4. Configure Environment Variables
Add your credentials to `.env`:
```env
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_WEBHOOK_SECRET=autodocs-local-secret
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
DEFAULT_REPOSITORY=your-username/your-repo
DEFAULT_BRANCH=main
```

> **Tip for local testing without a GitHub App**: You can also simply set `GITHUB_PAT=ghp_yourPersonalAccessToken` in `.env` to start immediately!

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 20+ (Node.js 22 recommended)
- Docker & Docker Compose
- Anthropic API Key (or DeepSeek API Key)

### Step 1: Clone and Configure Environment
```bash
git clone <your-repo>
cd DeltaDocs

# Copy environment template
cp .env.example .env
```
Edit `.env` to set your `ANTHROPIC_API_KEY`, database credentials, and GitHub repository.

### Step 2: Start Infrastructure (PostgreSQL & Redis)
```bash
# Start PostgreSQL (port 5432) and Redis (port 6379)
docker compose up -d postgres redis
```

### Step 3: Install Dependencies & Setup Database
```bash
# Install all workspace dependencies
npm install

# Build shared schema package
npm run build:shared

# Generate Prisma client and initialize database schema
npm run prisma:generate -w apps/api
npm run prisma:push -w apps/api
```

### Step 4: Start Applications
Open two terminal windows:

**Terminal 1: Start NestJS Backend API**
```bash
npm run dev:api
# API will start at http://localhost:3001
# Swagger docs: http://localhost:3001/api/docs-api
# Health check: http://localhost:3001/health
```

**Terminal 2: Start Next.js 15 Frontend Website**
```bash
npm run dev:web
# Live docs portal will be available at http://localhost:3000
# Admin console at http://localhost:3000/admin
```

---

## 🔄 Full vs Incremental Generation Flow

### 1. Full / Bootstrap Mode
- **When it runs**: 
  - When a repository is first added and no prior successful documentation exists.
  - When manually triggered from the Admin Console (`POST /api/admin/generate` with `generationType: "full"`).
- **Execution steps**:
  1. Recursively scans the repository tree via GitHub Git Trees API.
  2. Applies smart filtering to exclude `node_modules`, build artifacts (`dist`, `.next`), tests, and binaries.
  3. Loads prioritized architectural files (`package.json`, `schema.prisma`, configuration files, controllers, services).
  4. Runs `ts-morph` AST analysis to extract exported classes, interfaces, methods, and decorator annotations.
  5. Feeds codebase context into Anthropic Claude 3.5 Sonnet using the Full Generation prompt.
  6. Validates output with Zod against `DocumentationContentSchema`.
  7. Stores new `DocumentationVersion` record with `generationType: "full"`.

### 2. Incremental Update Mode
- **When it runs**:
  - On every subsequent push to the tracked branch (`main`) once a baseline exists.
- **Execution steps**:
  1. Compares the previous commit SHA and current commit SHA via GitHub Compare API.
  2. Extracts changed files, additions, deletions, and git diff patches.
  3. Runs `ts-morph` AST parsing exclusively on the modified files.
  4. Ingests the previous documentation baseline, commit message, author, diffs, and updated ASTs.
  5. The LLM updates affected sections while preserving unaffected modules.
  6. Computes a human-readable commit changelog and identifies any breaking changes or required database migrations.
  7. Persists an immutable new documentation version tied to the new commit SHA.

---

## 🚀 Bootstrapping Your First Documentation

Once your API is running, you can bootstrap documentation in any of three ways:

### Option 1: Via the Web Admin UI
Navigate to `http://localhost:3000/admin`, enter your repository name (e.g. `facebook/react` or your own repo), select **Full / Bootstrap Generation**, and click **Enqueue Documentation Job**.

### Option 2: Via REST API / cURL
```bash
curl -X POST http://localhost:3001/api/admin/generate \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "owner/repo",
    "generationType": "full"
  }'
```

### Option 3: Via GitHub Webhook
Push code to your repository:
```bash
git commit -m "feat: implement user auth service"
git push origin main
```
AutoDocs receives the push event, verifies HMAC SHA-256, generates incremental documentation, and updates the live documentation site!

---

## 📡 API Reference & Webhooks

### Ingress Webhook
- `POST /webhooks/github`
  - Headers: `x-github-event: push`, `x-hub-signature-256: sha256=...`
  - Validates signature and enqueues BullMQ job.

### Documentation Endpoints
- `GET /api/docs/latest?repository=owner/repo`: Returns latest active documentation.
- `GET /api/docs/versions?repository=owner/repo`: Returns paginated historical versions.
- `GET /api/docs/version/:commitSha?repository=owner/repo`: Returns documentation snapshot for a specific Git commit SHA.
- `GET /api/docs/stats?repository=owner/repo`: Aggregated metrics (total versions, average latency, success rate).

### Admin Endpoints
- `POST /api/admin/generate`: Trigger manual generation run.
- `GET /api/admin/generations`: List audit history of generation jobs.
- `POST /api/admin/generations/:id/retry`: Re-enqueue a failed job.

### System Diagnostics
- `GET /health`: Health status of database connection and API service.
- `GET /api/docs-api`: Interactive Swagger / OpenAPI documentation UI.

---

## 🐳 Docker Deployment

To launch the complete stack with Docker Compose:

```bash
# Configure your environment
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and GitHub parameters in .env

# Build and start all 4 services (PostgreSQL, Redis, NestJS API, Next.js Docs Web)
docker compose up -d --build

# View container logs
docker compose logs -f
```

- **Documentation Website**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **Swagger Documentation**: `http://localhost:3001/api/docs-api`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default | Required? |
|---|---|---|---|
| `PORT` | API server HTTP port | `3001` | No |
| `DOCS_WEB_PORT` | Next.js server port | `3000` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` | Yes |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Yes |
| `GITHUB_APP_ID` | GitHub App ID | - | Yes (for GitHub App) |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App RSA Private Key PEM | - | Yes (for GitHub App) |
| `GITHUB_APP_INSTALLATION_ID` | GitHub App Installation ID | - | Yes (for GitHub App) |
| `GITHUB_WEBHOOK_SECRET` | Secret token to verify webhook HMAC-SHA256 | - | Yes |
| `GITHUB_PAT` | Personal Access Token fallback | - | Optional |
| `DEFAULT_REPOSITORY` | Target repository (`owner/name`) | `owner/repo` | Yes |
| `DEFAULT_BRANCH` | Git branch to watch for pushes | `main` | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | - | Recommended |
| `PRIMARY_MODEL` | Claude model identifier | `claude-3-5-sonnet-20241022`| No |
| `DEEPSEEK_API_KEY` | DeepSeek fallback API Key | - | Optional |
| `QUEUE_CONCURRENCY` | Concurrent documentation workers | `2` | No |
| `QUEUE_MAX_RETRIES` | Max BullMQ job retry attempts | `3` | No |
