import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DOC_GENERATION_QUEUE } from './queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { GithubService } from '../github/github.service';
import { CodeAnalysisService } from '../code-analysis/code-analysis.service';
import { LlmService } from '../llm/llm.service';
import { GenerationJobPayload } from '@autodocs/shared';

@Processor(DOC_GENERATION_QUEUE, { concurrency: 2 })
export class DocGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
    private readonly codeAnalysis: CodeAnalysisService,
    private readonly llm: LlmService
  ) {
    super();
  }

  async process(job: Job<GenerationJobPayload>): Promise<any> {
    const { repository, commitSha, branch, generationType, manualTrigger } = job.data;
    const shortSha = commitSha.substring(0, 7);

    this.logger.log(`[Job ${job.id}] Starting ${generationType} documentation generation for ${repository}@${shortSha}`);

    // Update or create initial pending record
    let docVersion = await this.prisma.documentationVersion.upsert({
      where: {
        repository_commitSha: {
          repository,
          commitSha,
        },
      },
      update: {
        status: 'processing',
        generationType,
        branch,
      },
      create: {
        repository,
        commitSha,
        shortSha,
        branch,
        generationType,
        status: 'processing',
        changedFiles: job.data.changedFiles || [],
      },
    });

    try {
      // 1. Fetch commit metadata from GitHub
      let commitMetadata = {
        message: job.data.commitMessage || null,
        author: job.data.commitAuthor || null,
        date: job.data.commitDate ? new Date(job.data.commitDate) : null,
      };

      try {
        const ghCommit = await this.github.getCommit(repository, commitSha);
        commitMetadata = {
          message: ghCommit.message,
          author: ghCommit.author,
          date: ghCommit.date,
        };
      } catch (ghErr) {
        this.logger.warn(`Could not fetch GitHub commit directly: ${ghErr.message}. Continuing with provided payload.`);
      }

      // 2. Decide effective generation type: If incremental requested but no previous successful doc exists, upgrade to full
      let effectiveType = generationType;
      const latestExistingDoc = await this.prisma.documentationVersion.findFirst({
        where: {
          repository,
          status: 'success',
          content: { not: null as any },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (effectiveType === 'incremental' && !latestExistingDoc) {
        this.logger.log(`No prior documentation found for ${repository}. Upgrading generation type to 'full'.`);
        effectiveType = 'full';
      }

      let generationResult;

      if (effectiveType === 'full') {
        // --- Full Generation Flow ---
        this.logger.log(`Scanning repository ${repository}@${shortSha} for key files...`);
        let importantFiles: { path: string; content: string }[] = [];
        try {
          importantFiles = await this.github.getImportantFilesContent(repository, commitSha);
        } catch (scanErr) {
          this.logger.warn(`Error scanning repository files: ${scanErr.message}. Proceeding with fallback.`);
        }

        const astSummaries = this.codeAnalysis.analyzeSourceFiles(importantFiles);
        const formattedAst = this.codeAnalysis.formatAstForPrompt(astSummaries);

        generationResult = await this.llm.generateFullDocumentation({
          repository,
          commitSha,
          branch,
          files: importantFiles,
          astSummary: formattedAst,
        });

      } else {
        // --- Incremental Generation Flow ---
        const previousSha = latestExistingDoc?.commitSha || job.data.previousCommitSha;
        this.logger.log(`Comparing commit diff between ${previousSha?.substring(0, 7)} and ${shortSha}...`);

        let diffFiles: any[] = [];
        if (previousSha && previousSha !== commitSha) {
          try {
            const diffData = await this.github.getCommitDiff(repository, previousSha, commitSha);
            diffFiles = diffData.files;
          } catch (diffErr) {
            this.logger.warn(`Could not compute git diff: ${diffErr.message}`);
          }
        }

        // Run AST analysis on modified files that have content
        const filesWithContent = diffFiles
          .filter((f) => f.content)
          .map((f) => ({ path: f.filename, content: f.content }));
        
        const astSummaries = this.codeAnalysis.analyzeSourceFiles(filesWithContent);
        const formattedAst = this.codeAnalysis.formatAstForPrompt(astSummaries);

        generationResult = await this.llm.generateIncrementalDocumentation({
          repository,
          commitSha,
          commitMessage: commitMetadata.message || 'Updated codebase',
          commitAuthor: commitMetadata.author || 'Contributor',
          branch,
          previousDocs: latestExistingDoc?.content as any,
          changedFiles: diffFiles,
          astSummary: formattedAst,
        });
      }

      // 3. Persist success state to database
      docVersion = await this.prisma.documentationVersion.update({
        where: { id: docVersion.id },
        data: {
          status: 'success',
          generationType: effectiveType,
          commitMessage: commitMetadata.message,
          commitAuthor: commitMetadata.author,
          commitDate: commitMetadata.date,
          content: generationResult.content as any,
          rawMarkdown: generationResult.rawMarkdown,
          modelUsed: generationResult.modelUsed,
          generationTimeMs: generationResult.generationTimeMs,
          tokenUsage: generationResult.tokenUsage || undefined,
          errorMessage: null,
        },
      });

      this.logger.log(`[Job ${job.id}] Successfully generated documentation for ${repository}@${shortSha} in ${generationResult.generationTimeMs}ms`);
      return { success: true, docId: docVersion.id };

    } catch (error) {
      this.logger.error(`[Job ${job.id}] Generation failed for ${repository}@${shortSha}:`, error);

      await this.prisma.documentationVersion.update({
        where: { id: docVersion.id },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Unknown generation failure',
        },
      });

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job?.id} failed after attempts: ${error.message}`);
  }
}
