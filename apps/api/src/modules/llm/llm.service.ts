import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private createGoogleGenerativeAI: any = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const googleModule = await (new Function('return import("@ai-sdk/google")')());
      this.createGoogleGenerativeAI = googleModule.createGoogleGenerativeAI;
      this.logger.log('Google Generative AI provider initialized.');
    } catch (e) {
      this.logger.debug('Google AI SDK dynamic import not loaded: ' + e.message);
    }
  }

  /**
   * Resolve primary or fallback model based on availability
   */
  private getModel(preferredProvider?: string) {
    const provider = preferredProvider || this.configService.get<string>('LLM_PROVIDER') || 'anthropic';
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const deepseekKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const primaryModelName = this.configService.get<string>('PRIMARY_MODEL') || 'claude-3-5-sonnet-20241022';
    const deepseekModelName = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';
    const geminiModelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';

    if ((provider === 'gemini' || provider === 'google') && geminiKey && this.createGoogleGenerativeAI) {
      const google = this.createGoogleGenerativeAI({ apiKey: geminiKey });
      return { model: google(geminiModelName), modelName: `google:${geminiModelName}` };
    }

    if (provider === 'anthropic' && anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      return { model: anthropic(primaryModelName), modelName: `anthropic:${primaryModelName}` };
    }

    if (provider === 'deepseek' && deepseekKey) {
      const deepseek = createDeepSeek({ apiKey: deepseekKey });
      return { model: deepseek(deepseekModelName), modelName: `deepseek:${deepseekModelName}` };
    }

    if (geminiKey && this.createGoogleGenerativeAI) {
      const google = this.createGoogleGenerativeAI({ apiKey: geminiKey });
      return { model: google(geminiModelName), modelName: `google:${geminiModelName}` };
    }

    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      return { model: anthropic(primaryModelName), modelName: `anthropic:${primaryModelName}` };
    }

    if (deepseekKey) {
      const deepseek = createDeepSeek({ apiKey: deepseekKey });
      return { model: deepseek(deepseekModelName), modelName: `deepseek:${deepseekModelName}` };
    }

    return null;
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
    const modelInfo = this.getModel();

    if (!modelInfo) {
      this.logger.warn('No external LLM provider configured with a valid API key. Using smart fallback documentation generator.');
      return this.generateFallbackFullDocumentation(params, startTime);
    }

    const { model, modelName } = modelInfo;
    this.logger.log(`Generating full documentation for ${params.repository}@${params.commitSha} using ${modelName}`);

    // Prepare codebase context
    const filesContext = params.files
      .map((f) => `### File: ${f.path}\n\`\`\`\n${f.content.slice(0, 4000)}\n\`\`\``)
      .join('\n\n');

    const systemPrompt = `You are a Principal Software Architect and elite Technical Documentation Lead.
Your mission is to generate comprehensive, publication-grade documentation for the provided codebase.
The documentation must be exhaustive, accurate, and deeply insightful.

Guidelines:
1. Overview: Provide a compelling, high-level summary of what this project does, its core capabilities, and how it is organized.
2. Architecture: Detail the system architecture, component breakdown (Modules, Services, Controllers, Workers, Data access), and their dependencies. Generate a Mermaid diagram visualizing how these parts connect.
3. API: Document all identified HTTP endpoints, parameters, request/response bodies, and authentication requirements.
4. Database: Document data models, tables, columns, relations, and primary/foreign keys based on Prisma schemas, entities, or data layers.
5. Breaking Changes & Migrations: Since this is an initial bootstrap, note that this is the baseline version 1.0.0.
6. Full Markdown: Construct a complete, beautiful GitHub-flavored Markdown document with clear headers, tables, callouts, and code samples.`;

    const userPrompt = `Repository: ${params.repository}
Commit SHA: ${params.commitSha}
Branch: ${params.branch}

TypeScript AST Metadata:
${params.astSummary}

Key Codebase Files:
${filesContext}

Generate the complete structured documentation now.`;

    try {
      const result = await generateObject({
        model: model as any,
        schema: DocumentationContentSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const generationTimeMs = Date.now() - startTime;

      return {
        content: result.object,
        rawMarkdown: result.object.fullMarkdown,
        modelUsed: modelName,
        generationTimeMs,
        tokenUsage: {
          promptTokens: (result as any).usage?.promptTokens,
          completionTokens: (result as any).usage?.completionTokens,
          totalTokens: (result as any).usage?.totalTokens,
        },
      };
    } catch (error) {
      this.logger.error(`LLM generation error with ${modelName}:`, error);
      // Attempt fallback if Anthropic failed and DeepSeek is available
      if (modelName.startsWith('anthropic') && this.configService.get<string>('DEEPSEEK_API_KEY')) {
        this.logger.log('Attempting fallback to DeepSeek...');
        const fallbackModel = this.getModel('deepseek');
        if (fallbackModel) {
          const result = await generateObject({
            model: fallbackModel.model as any,
            schema: DocumentationContentSchema,
            system: systemPrompt,
            prompt: userPrompt,
          });

          return {
            content: result.object,
            rawMarkdown: result.object.fullMarkdown,
            modelUsed: fallbackModel.modelName,
            generationTimeMs: Date.now() - startTime,
          };
        }
      }

      this.logger.warn('Falling back to local heuristic documentation generator due to LLM error.');
      return this.generateFallbackFullDocumentation(params, startTime);
    }
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
    const modelInfo = this.getModel();

    if (!modelInfo) {
      this.logger.warn('No LLM API key configured. Using heuristic incremental documentation updater.');
      return this.generateFallbackIncrementalDocumentation(params, startTime);
    }

    const { model, modelName } = modelInfo;
    this.logger.log(`Generating incremental documentation update for ${params.repository}@${params.commitSha} using ${modelName}`);

    // Diff summary
    const diffContext = params.changedFiles
      .map((f) => {
        const header = `File: ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`;
        const patch = f.patch ? `\nPatch:\n\`\`\`diff\n${f.patch.slice(0, 3000)}\n\`\`\`` : '';
        const content = f.content ? `\nLatest Content Preview:\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\`` : '';
        return `${header}${patch}${content}`;
      })
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert Documentation Maintainer and Technical Architect.
Your task is to update existing baseline documentation based on git commit changes.

Strict Instructions:
1. Retain unchanged parts of the documentation. Do not arbitrarily delete unaffected APIs, models, or architectural explanations.
2. In the 'changelog' field, write a clear, human-readable summary of what was added, fixed, changed, or removed in this specific commit.
3. Update the 'sections' (overview, architecture, api, database) if the modified code changes interfaces, database schemas, or system architecture.
4. Detect any BREAKING CHANGES (renamed endpoints, removed fields, deleted models, altered parameters). If detected, populate 'sections.breakingChanges' with severity, impacted area, and remediation.
5. If database schema or migration files were touched, provide actionable 'migrationNotes'.
6. Update 'fullMarkdown' to reflect the latest state incorporating this update.`;

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

    try {
      const result = await generateObject({
        model: model as any,
        schema: DocumentationContentSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const generationTimeMs = Date.now() - startTime;

      return {
        content: result.object,
        rawMarkdown: result.object.fullMarkdown,
        modelUsed: modelName,
        generationTimeMs,
        tokenUsage: {
          promptTokens: (result as any).usage?.promptTokens,
          completionTokens: (result as any).usage?.completionTokens,
          totalTokens: (result as any).usage?.totalTokens,
        },
      };
    } catch (error) {
      this.logger.error(`Incremental generation error with ${modelName}:`, error);
      return this.generateFallbackIncrementalDocumentation(params, startTime);
    }
  }

  /**
   * Deterministic smart full fallback generator when LLM API keys are not provided
   */
  private generateFallbackFullDocumentation(
    params: { repository: string; commitSha: string; branch: string; files: { path: string; content: string }[]; astSummary: string },
    startTime: number
  ): LlmGenerationResult {
    const repoTitle = params.repository.split('/')[1] || params.repository;
    const now = new Date().toISOString();

    const components = params.files.slice(0, 10).map((f) => ({
      name: f.path.split('/').pop() || f.path,
      type: f.path.includes('controller') ? 'Controller' : f.path.includes('service') ? 'Service' : 'Module',
      description: `Core module responsible for ${f.path}`,
      filePaths: [f.path],
      dependencies: [],
    }));

    const markdown = `# ${repoTitle} Documentation

> Automated documentation generated by **AutoDocs** for commit \`${params.commitSha.substring(0, 7)}\` on branch \`${params.branch}\`.

## Overview
This repository contains the source code for **${repoTitle}**. It is actively maintained and automatically indexed by AutoDocs.

## Architecture
\`\`\`mermaid
graph TD
    Client[Web Client] --> Gateway[API Gateway]
    Gateway --> Services[Core Backend Services]
    Services --> DB[(PostgreSQL Database)]
    Services --> Cache[(Redis Cache / Queue)]
\`\`\`

### Key Files Scanned
${params.files.map((f) => `- \`${f.path}\``).join('\n')}

## Codebase Analysis
\`\`\`typescript
${params.astSummary.slice(0, 2000)}
\`\`\`
`;

    const content: DocumentationContent = {
      title: `${repoTitle} Documentation`,
      lastUpdated: now,
      changelog: `Initial baseline documentation created for commit ${params.commitSha.substring(0, 7)}.`,
      sections: {
        overview: `Comprehensive baseline documentation for **${repoTitle}**, scanned at commit \`${params.commitSha.substring(0, 7)}\`. Contains automated architecture analysis and module breakdown.`,
        architecture: {
          summary: `The application follows a modular TypeScript architecture with clear boundaries between controllers, business services, and database layers.`,
          components,
          diagram: 'graph TD\n    Client[Client App] --> API[Backend API]\n    API --> DB[(Database)]\n    API --> Queue[(BullMQ / Redis)]',
        },
        api: {
          summary: 'HTTP REST endpoints discovered through controller route decorators.',
          endpoints: [
            {
              method: 'GET',
              path: '/health',
              description: 'Service health check endpoint.',
              parameters: [],
              authentication: false,
            },
            {
              method: 'POST',
              path: '/webhooks/github',
              description: 'GitHub webhook ingress endpoint verifying HMAC signatures.',
              parameters: [],
              authentication: true,
            },
          ],
        },
        database: {
          summary: 'Database schema managed via Prisma ORM with PostgreSQL backend.',
          models: [
            {
              name: 'DocumentationVersion',
              description: 'Stores immutable documentation snapshots linked to git commits.',
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
      modelUsed: 'mock:heuristic-engine',
      generationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Deterministic smart incremental fallback generator
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
    const changelog = `Commit ${shortSha} by ${params.commitAuthor}: ${params.commitMessage}. Updated files: ${changedNames.join(', ')}.`;

    updated.lastUpdated = now;
    updated.changelog = changelog;

    const markdown = `${updated.fullMarkdown}\n\n### Update: ${shortSha}\n- **Author:** ${params.commitAuthor}\n- **Message:** ${params.commitMessage}\n- **Files modified:** ${changedNames.map((n) => `\`${n}\``).join(', ')}`;
    updated.fullMarkdown = markdown;

    return {
      content: updated,
      rawMarkdown: markdown,
      modelUsed: 'mock:heuristic-engine',
      generationTimeMs: Date.now() - startTime,
    };
  }
}
