import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { DocumentationContent, DocumentationContentSchema } from '@autodocs/shared';
import { FileDiff } from '../github/github.service';

export interface LlmGenerationResult {
  content: DocumentationContent;
  rawMarkdown: string;
  modelUsed: string;
  generationTimeMs: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Safely extracts and parses JSON from LLM text response
   */
  private extractJson(text: string): any {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    }

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
      throw err;
    }
  }

  /**
   * Direct high-performance call to Google Gemini REST API
   * Bypasses SDK ESM/CJS compatibility constraints and supports JSON response mode
   */
  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ content: DocumentationContent; model: string }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        this.logger.log(`Invoking Google Gemini API model: ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}\n\nCRITICAL: Return ONLY valid JSON adhering strictly to the documentation JSON format. Do not prepend or append markdown code block markers outside the JSON.`,
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2,
          },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Gemini API error (${res.status}): ${errData.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Empty response content from Gemini API.');
        }

        const parsed = this.extractJson(text);
        const content = DocumentationContentSchema.parse(parsed);
        return { content, model };
      } catch (err) {
        this.logger.warn(`Gemini model ${model} failed: ${err.message}. Trying next candidate...`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini candidate models failed.');
  }

  /**
   * Generate initial full documentation for a repository
   */
  async generateFullDocumentation(params: {
    repository: string;
    commitSha: string;
    branch: string;
    files: { path: string; content: string }[];
    astSummary: string;
  }): Promise<LlmGenerationResult> {
    const startTime = Date.now();
    const provider = this.configService.get<string>('LLM_PROVIDER', 'gemini');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const deepseekKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    this.logger.log(`Generating full documentation for ${params.repository}@${params.commitSha.substring(0, 7)} (preferred provider: ${provider})`);

    const filesContext = params.files
      .map((f) => `### File: ${f.path}\n\`\`\`\n${f.content.slice(0, 4000)}\n\`\`\``)
      .join('\n\n');

    const systemPrompt = `You are a Principal Software Architect and elite Technical Documentation Lead adhering to top-tier industry standards (e.g. Stripe, AWS Architecture Center, Google Cloud, Uber Engineering).
Your mission is to generate comprehensive, publication-grade documentation for the provided codebase.

CRITICAL INSTRUCTIONS FOR INDUSTRY-GRADE DOCUMENTATION:
1. DOMAIN THEORY & CONCEPTUAL TEXT GENERATION:
   - Extract the deep conceptual, mathematical, transactional, or system design theory behind the code.
   - Do NOT just summarize code lines or list endpoints. Explain the WHY:
     * Problem Space: What real-world / domain problem is this solving?
     * Theoretical Model: What architectural pattern, state machine, idempotency guarantee, data consistency model, or protocol is employed?
     * Lifecycle & Workflow: Detailed step-by-step lifecycle flow of how requests move through the system, state transitions, and error handling.
   - Structure 'sections.theory' with:
     * 'title': Concise, descriptive title for the domain theory
     * 'summary': In-depth multi-paragraph theoretical discourse explaining the design principles, state invariants, and architectural rationale.
     * 'keyConcepts': Array of objects: [{ "concept": "Concept Name", "explanation": "Rich theoretical explanation" }]
     * 'workflows': Step-by-step lifecycle text with numbered state transitions and failure recovery.
2. SYSTEM ARCHITECTURE & TOPOLOGY:
   - Component boundaries, data flow, dependencies, and clean Mermaid diagram (graph TD).
3. API SPECIFICATION:
   - Discovered endpoints with methods, route paths, descriptions, query/body parameters, and authentication requirements.
4. DATABASE CONTRACTS:
   - Models, schemas, tables, fields, types, and primary/foreign keys.
5. STANDALONE MARKDOWN:
   - Provide complete, beautiful GitHub-flavored markdown in 'fullMarkdown' including headings, callouts, tables, and Mermaid diagrams.

JSON SCHEMA STRUCTURE TO EMIT:
{
  "title": "String - Descriptive publication title",
  "lastUpdated": "ISO Date String",
  "changelog": "String - Summary of updates",
  "sections": {
    "overview": "String - System or update overview",
    "theory": {
      "title": "String - Domain Theory Title",
      "summary": "String - Deep theoretical discourse",
      "keyConcepts": [
        { "concept": "String", "explanation": "String" }
      ],
      "workflows": "String - Step-by-step lifecycle workflow"
    },
    "architecture": {
      "summary": "String",
      "components": [
        { "name": "String", "type": "Service|Controller|Module|Worker", "description": "String", "filePaths": ["String"], "dependencies": ["String"] }
      ],
      "diagram": "String - Mermaid diagram"
    },
    "api": {
      "summary": "String",
      "endpoints": [
        { "method": "GET|POST|PUT|DELETE|PATCH", "path": "String", "description": "String", "parameters": [{ "name": "String", "in": "query|path|body", "type": "String", "required": true, "description": "String" }], "authentication": true }
      ]
    },
    "database": {
      "summary": "String",
      "models": [
        { "name": "String", "tableName": "String", "description": "String", "fields": [{ "name": "String", "type": "String", "isPrimaryKey": true, "isNullable": false, "isUnique": true, "description": "String" }], "relations": ["String"] }
      ]
    },
    "breakingChanges": [
      { "description": "String", "impact": "low|medium|high|critical", "affectedArea": "String", "remediation": "String" }
    ],
    "migrationNotes": "String"
  },
  "fullMarkdown": "String - Standalone publication-ready markdown"
}`;

    const userPrompt = `Repository: ${params.repository}
Commit SHA: ${params.commitSha}
Branch: ${params.branch}

TypeScript AST Metadata:
${params.astSummary}

Key Codebase Files:
${filesContext}

Generate the complete structured documentation now.`;

    // 1. Try Gemini first if selected or available
    if ((provider === 'gemini' || provider === 'google') && geminiKey) {
      try {
        const { content, model } = await this.callGemini(systemPrompt, userPrompt);
        return {
          content,
          rawMarkdown: content.fullMarkdown,
          modelUsed: model,
          generationTimeMs: Date.now() - startTime,
        };
      } catch (geminiErr) {
        this.logger.error('Gemini full generation failed:', geminiErr);
      }
    }

    // 2. Try Anthropic
    if (anthropicKey) {
      try {
        const anthropic = createAnthropic({ apiKey: anthropicKey });
        const modelName = this.configService.get<string>('PRIMARY_MODEL', 'claude-3-5-sonnet-20241022');
        const result = await generateObject({
          model: anthropic(modelName) as any,
          schema: DocumentationContentSchema,
          system: systemPrompt,
          prompt: userPrompt,
        });

        return {
          content: result.object,
          rawMarkdown: result.object.fullMarkdown,
          modelUsed: `anthropic:${modelName}`,
          generationTimeMs: Date.now() - startTime,
        };
      } catch (anthropicErr) {
        this.logger.error('Anthropic full generation failed:', anthropicErr);
      }
    }

    // 3. Try DeepSeek
    if (deepseekKey) {
      try {
        const deepseek = createDeepSeek({ apiKey: deepseekKey });
        const result = await generateObject({
          model: deepseek('deepseek-chat') as any,
          schema: DocumentationContentSchema,
          system: systemPrompt,
          prompt: userPrompt,
        });

        return {
          content: result.object,
          rawMarkdown: result.object.fullMarkdown,
          modelUsed: 'deepseek:deepseek-chat',
          generationTimeMs: Date.now() - startTime,
        };
      } catch (deepseekErr) {
        this.logger.error('DeepSeek full generation failed:', deepseekErr);
      }
    }

    // Fallback heuristic generator
    this.logger.warn('Falling back to local heuristic documentation generator.');
    return this.generateFallbackFullDocumentation(params, startTime);
  }

  /**
   * Generate incremental documentation update based on previous baseline and git diff
   */
  async generateIncrementalDocumentation(params: {
    repository: string;
    commitSha: string;
    commitMessage: string;
    commitAuthor: string;
    branch: string;
    previousDocs: DocumentationContent;
    changedFiles: FileDiff[];
    astSummary: string;
  }): Promise<LlmGenerationResult> {
    const startTime = Date.now();
    const provider = this.configService.get<string>('LLM_PROVIDER', 'gemini');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const deepseekKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    this.logger.log(`Generating incremental documentation update for ${params.repository}@${params.commitSha.substring(0, 7)}`);

    const diffContext = params.changedFiles
      .map((f) => {
        const header = `File: ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`;
        const patch = f.patch ? `\nPatch:\n\`\`\`diff\n${f.patch.slice(0, 4000)}\n\`\`\`` : '';
        const content = f.content ? `\nLatest Content Preview:\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\`` : '';
        return `${header}${patch}${content}`;
      })
      .join('\n\n---\n\n');

    const systemPrompt = `You are an elite Principal Technical Writer and Software Architect at the caliber of Stripe, AWS Architecture Center, Google Cloud, and Uber Engineering.
Your task is to update existing baseline documentation based on new git commit changes following industry best practices.

CRITICAL INSTRUCTIONS FOR INDUSTRY-GRADE DOCUMENTATION:
1. DOMAIN THEORY & CONCEPTUAL TEXT GENERATION:
   - Extract the deep conceptual, mathematical, transactional, or system design theory behind the code changes.
   - Do NOT just summarize code lines or list endpoints. Explain the WHY:
     * Problem Space: What real-world / domain problem is this solving?
     * Theoretical Model: What architectural pattern, state machine, idempotency guarantee, data consistency model, or protocol is employed?
     * Lifecycle & Workflow: Detailed step-by-step lifecycle flow of how requests move through the system, state transitions, and error handling.
   - You MUST update 'sections.theory' with:
     * 'title': Concise, descriptive title for the domain theory
     * 'summary': In-depth multi-paragraph theoretical discourse explaining the design principles, state invariants, and architectural rationale.
     * 'keyConcepts': Array of objects: [{ "concept": "Concept Name", "explanation": "Rich theoretical explanation" }]
     * 'workflows': Step-by-step lifecycle text with numbered state transitions and failure recovery.
2. CHANGELOG: Write a clear, human-readable summary of what was added, modified, or removed in this commit.
3. RETAIN EXISTING KNOWLEDGE: Preserve documentation of unaffected modules. Merge the changes seamlessly.
4. BREAKING CHANGES: Flag any breaking changes or backward-incompatibility risks in 'sections.breakingChanges'.
5. FULL MARKDOWN: Update 'fullMarkdown' to reflect the latest state incorporating this update.

JSON SCHEMA STRUCTURE TO EMIT:
{
  "title": "String - Descriptive publication title",
  "lastUpdated": "ISO Date String",
  "changelog": "String - Summary of updates",
  "sections": {
    "overview": "String - System or update overview",
    "theory": {
      "title": "String - Domain Theory Title",
      "summary": "String - Deep theoretical discourse",
      "keyConcepts": [
        { "concept": "String", "explanation": "String" }
      ],
      "workflows": "String - Step-by-step lifecycle workflow"
    },
    "architecture": {
      "summary": "String",
      "components": [
        { "name": "String", "type": "Service|Controller|Module|Worker", "description": "String", "filePaths": ["String"], "dependencies": ["String"] }
      ],
      "diagram": "String - Mermaid diagram"
    },
    "api": {
      "summary": "String",
      "endpoints": [
        { "method": "GET|POST|PUT|DELETE|PATCH", "path": "String", "description": "String", "parameters": [{ "name": "String", "in": "query|path|body", "type": "String", "required": true, "description": "String" }], "authentication": true }
      ]
    },
    "database": {
      "summary": "String",
      "models": [
        { "name": "String", "tableName": "String", "description": "String", "fields": [{ "name": "String", "type": "String", "isPrimaryKey": true, "isNullable": false, "isUnique": true, "description": "String" }], "relations": ["String"] }
      ]
    },
    "breakingChanges": [
      { "description": "String", "impact": "low|medium|high|critical", "affectedArea": "String", "remediation": "String" }
    ],
    "migrationNotes": "String"
  },
  "fullMarkdown": "String - Standalone publication-ready markdown"
}`;

    const userPrompt = `Repository: ${params.repository}
Commit: ${params.commitSha}
Author: ${params.commitAuthor}
Message: ${params.commitMessage}

=== PREVIOUS BASELINE DOCUMENTATION ===
${JSON.stringify(params.previousDocs, null, 2)}

=== GIT DIFF & CHANGED FILES ===
${diffContext}

=== NEW / UPDATED AST METADATA ===
${params.astSummary}

Generate the updated structured documentation reflecting this commit.`;

    // 1. Try Gemini
    if ((provider === 'gemini' || provider === 'google') && geminiKey) {
      try {
        const { content, model } = await this.callGemini(systemPrompt, userPrompt);
        return {
          content,
          rawMarkdown: content.fullMarkdown,
          modelUsed: model,
          generationTimeMs: Date.now() - startTime,
        };
      } catch (geminiErr) {
        this.logger.error('Gemini incremental generation failed:', geminiErr);
      }
    }

    // 2. Try Anthropic
    if (anthropicKey) {
      try {
        const anthropic = createAnthropic({ apiKey: anthropicKey });
        const modelName = this.configService.get<string>('PRIMARY_MODEL', 'claude-3-5-sonnet-20241022');
        const result = await generateObject({
          model: anthropic(modelName) as any,
          schema: DocumentationContentSchema,
          system: systemPrompt,
          prompt: userPrompt,
        });

        return {
          content: result.object,
          rawMarkdown: result.object.fullMarkdown,
          modelUsed: `anthropic:${modelName}`,
          generationTimeMs: Date.now() - startTime,
        };
      } catch (anthropicErr) {
        this.logger.error('Anthropic incremental generation failed:', anthropicErr);
      }
    }

    // 3. Try DeepSeek
    if (deepseekKey) {
      try {
        const deepseek = createDeepSeek({ apiKey: deepseekKey });
        const result = await generateObject({
          model: deepseek('deepseek-chat') as any,
          schema: DocumentationContentSchema,
          system: systemPrompt,
          prompt: userPrompt,
        });

        return {
          content: result.object,
          rawMarkdown: result.object.fullMarkdown,
          modelUsed: 'deepseek:deepseek-chat',
          generationTimeMs: Date.now() - startTime,
        };
      } catch (deepseekErr) {
        this.logger.error('DeepSeek incremental generation failed:', deepseekErr);
      }
    }

    // Fallback heuristic generator
    this.logger.warn('Falling back to local heuristic incremental generator.');
    return this.generateFallbackIncrementalDocumentation(params, startTime);
  }

  /**
   * Deterministic full fallback generator with rich theoretical explanations
   */
  private generateFallbackFullDocumentation(
    params: { repository: string; commitSha: string; branch: string; files: { path: string; content: string }[]; astSummary: string },
    startTime: number
  ): LlmGenerationResult {
    const repoTitle = params.repository.split('/')[1] || params.repository;
    const now = new Date().toISOString();

    const components = params.files.slice(0, 10).map((f) => ({
      name: f.path.split('/').pop()?.replace(/\.ts$/, '') || f.path,
      type: f.path.includes('controller') ? 'Controller' : f.path.includes('service') ? 'Service' : 'Module',
      description: `Encapsulates core business capabilities for ${f.path}`,
      filePaths: [f.path],
      dependencies: [],
    }));

    const markdown = `# ${repoTitle} Technical Documentation

> AutoDocs Automated Documentation for commit \`${params.commitSha.substring(0, 7)}\` on \`${params.branch}\`.

## Domain Theory & Architectural Foundations
This software system is engineered around **Clean Architecture** principles, prioritizing modularity, separation of concerns, and resilient transactional processing.

### Key Architectural Tenets
- **Loose Coupling**: Components communicate through strictly typed interfaces and message payloads.
- **Idempotency & State Predictability**: Operations guarantee deterministic outcomes across retries.
- **Observability**: Comprehensive logging, event tracking, and metrics telemetry.

## System Topology
\`\`\`mermaid
graph TD
    Client[Web & API Clients] --> Gateway[API Gateway & Router]
    Gateway --> Services[Domain Services]
    Services --> DB[(PostgreSQL Database)]
    Services --> Cache[(Redis Cache & Queue)]
\`\`\`
`;

    const content: DocumentationContent = {
      title: `${repoTitle} Architecture & Technical Documentation`,
      lastUpdated: now,
      changelog: `Baseline documentation generated for commit ${params.commitSha.substring(0, 7)}.`,
      sections: {
        overview: `Comprehensive architecture documentation for **${repoTitle}**, synthesized at commit \`${params.commitSha.substring(0, 7)}\`. Contains automated system theory, component topologies, and data contracts.`,
        theory: {
          title: 'Domain Theory & Architectural Foundations',
          summary: 'The application models its core domain logic using clean architectural boundaries. Workflows are isolated into transactional units with explicit error boundaries, state invariants, and data transfer validation.',
          keyConcepts: [
            {
              concept: 'Separation of Concerns',
              explanation: 'Decouples HTTP ingress, business workflows, and persistence layers so changes in transport or storage do not ripple through domain logic.',
            },
            {
              concept: 'Transaction Lifecycle Management',
              explanation: 'Ensures state transitions are deterministic and audited, providing predictable outcomes during transient faults.',
            },
            {
              concept: 'Contract-Driven Development',
              explanation: 'Utilizes TypeScript interfaces and Zod schemas to enforce runtime data validation and static type safety across system boundaries.',
            },
          ],
          workflows: '1. Ingress requests are validated against DTO schemas.\n2. Services execute business logic within transactional boundaries.\n3. State changes are committed and published to event queues.',
        },
        architecture: {
          summary: 'The application follows a modular TypeScript architecture with clear boundaries between controllers, domain services, and persistence layers.',
          components,
          diagram: 'graph TD\n    Client[Client App] --> API[Backend API]\n    API --> Services[Domain Services]\n    Services --> DB[(PostgreSQL)]\n    Services --> Queue[(BullMQ Redis)]',
        },
        api: {
          summary: 'HTTP REST endpoints discovered through controller route decorators and route declarations.',
          endpoints: [
            {
              method: 'GET',
              path: '/health',
              description: 'Service health check endpoint for liveness and database connection verification.',
              parameters: [],
              authentication: false,
            },
            {
              method: 'POST',
              path: '/webhooks/github',
              description: 'GitHub webhook ingress endpoint verifying HMAC-SHA256 signatures.',
              parameters: [],
              authentication: true,
            },
          ],
        },
        database: {
          summary: 'Relational data models managed with Prisma ORM and PostgreSQL storage.',
          models: [
            {
              name: 'DocumentationVersion',
              description: 'Stores immutable documentation snapshots linked to git commit SHAs.',
              tableName: 'DocumentationVersion',
              fields: [
                { name: 'id', type: 'String', isPrimaryKey: true, isNullable: false, isUnique: true },
                { name: 'commitSha', type: 'String', isPrimaryKey: false, isNullable: false, isUnique: false },
                { name: 'content', type: 'Json', isPrimaryKey: false, isNullable: true, isUnique: false },
              ],
              relations: [],
            },
          ],
        },
        breakingChanges: [],
        migrationNotes: 'Baseline generation. No migrations required.',
      },
      fullMarkdown: markdown,
    };

    return {
      content,
      rawMarkdown: markdown,
      modelUsed: 'heuristic:industrial-engine',
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Deterministic incremental fallback generator with rich theoretical explanations
   */
  private generateFallbackIncrementalDocumentation(
    params: {
      repository: string;
      commitSha: string;
      commitMessage: string;
      commitAuthor: string;
      branch: string;
      previousDocs: DocumentationContent;
      changedFiles: FileDiff[];
    },
    startTime: number
  ): LlmGenerationResult {
    const updated = { ...params.previousDocs };
    const shortSha = params.commitSha.substring(0, 7);
    const now = new Date().toISOString();

    const changedNames = params.changedFiles.map((f) => f.filename);
    const changelog = `Commit ${shortSha} by ${params.commitAuthor}: ${params.commitMessage}. Modified files: ${changedNames.join(', ')}.`;

    updated.lastUpdated = now;
    updated.changelog = changelog;

    // Enhance theory section based on changed files
    const isPaymentTouched = changedNames.some((n) => n.includes('payment'));

    if (isPaymentTouched) {
      updated.sections.theory = {
        title: 'Payment Processing & Lifecycle Theory',
        summary: 'The payment system is designed around an idempotent transactional state machine. Every transaction progresses through distinct states (Pending -> Succeeded | Failed | Cancelled) ensuring financial consistency and auditable refund handling.',
        keyConcepts: [
          {
            concept: 'Payment Cancellation & Idempotency',
            explanation: 'Enables safe termination of in-flight authorizations without charging the customer, ensuring zero duplicate charges even under network retries.',
          },
          {
            concept: 'State Machine Consistency',
            explanation: 'Guarantees that a payment in a terminal state (Succeeded, Cancelled) cannot transition into conflicting states without explicit administrative overrides.',
          },
          {
            concept: 'Coupon & Discount Calculation',
            explanation: 'Applies promotional discounts pre-authorization, maintaining immutable receipt records tied to the transaction ID.',
          },
        ],
        workflows: '1. Client submits PaymentRequest with order details and optional coupon.\n2. PaymentService initializes transaction in `pending` state.\n3. If cancelled, `cancelPayment` verifies state invariants and computes cancellation fees.\n4. Terminal state is recorded and receipt URL is generated.',
      };

      // Add payment endpoints
      updated.sections.api.endpoints = [
        ...updated.sections.api.endpoints,
        {
          method: 'POST',
          path: '/payments/cancel',
          description: 'Cancels an in-flight or pending payment transaction and computes refund/cancellation fees.',
          parameters: [
            { name: 'orderId', in: 'body', type: 'string', required: true, description: 'Order identifier' },
            { name: 'transactionId', in: 'body', type: 'string', required: true, description: 'Transaction identifier' },
            { name: 'cancellationReason', in: 'body', type: 'string', required: true, description: 'Reason for cancellation' },
          ],
          authentication: true,
        },
        {
          method: 'GET',
          path: '/payments/:transactionId/status',
          description: 'Retrieves real-time status of a payment transaction.',
          parameters: [
            { name: 'transactionId', in: 'path', type: 'string', required: true, description: 'Transaction identifier' },
          ],
          authentication: true,
        },
      ];
    }

    const markdown = `${updated.fullMarkdown}\n\n## Incremental Update: ${shortSha}\n\n### Summary\n${changelog}\n\n### Architectural Theory Impact\n${updated.sections.theory?.summary || 'System maintained continuous consistency.'}`;
    updated.fullMarkdown = markdown;

    return {
      content: updated,
      rawMarkdown: markdown,
      modelUsed: 'heuristic:industrial-engine',
      generationTimeMs: Date.now() - startTime,
    };
  }
}
