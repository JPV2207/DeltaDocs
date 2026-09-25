import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { DOC_GENERATION_QUEUE, JOB_GENERATE_DOCS } from '../queue/queue.constants';
import { GenerationJobPayload, ManualGenerateRequestDto } from '@autodocs/shared';
import { GithubService } from '../github/github.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly github: GithubService,
    @InjectQueue(DOC_GENERATION_QUEUE) private readonly queue: Queue<GenerationJobPayload>
  ) {}

  /**
   * Manually trigger documentation generation
   */
  async triggerGeneration(dto: ManualGenerateRequestDto) {
    const repository = dto.repository || this.configService.get<string>('DEFAULT_REPOSITORY', 'example/repo');
    const branch = dto.branch || this.configService.get<string>('DEFAULT_BRANCH', 'main');

    let commitSha = dto.commitSha;
    let commitMessage = 'Manual generation trigger';
    let commitAuthor = 'Admin';

    // If commitSha not provided, fetch the HEAD of the branch
    if (!commitSha) {
      try {
        const headCommit = await this.github.getCommit(repository, branch);
        commitSha = headCommit.sha;
        commitMessage = headCommit.message;
        commitAuthor = headCommit.author;
      } catch (err) {
        // Fallback dummy sha for testing when github is not reachable
        commitSha = 'manual-' + Date.now().toString(16);
      }
    }

    const generationType = dto.generationType || 'full';

    const payload: GenerationJobPayload = {
      repository,
      commitSha,
      branch,
      generationType,
      commitMessage,
      commitAuthor,
      manualTrigger: true,
    };

    const safeJobId = `${repository.replace(/[\/:]/g, '_')}__${commitSha}__${Date.now()}`;
    const job = await this.queue.add(JOB_GENERATE_DOCS, payload, {
      jobId: safeJobId,
    });

    this.logger.log(`Admin triggered ${generationType} generation for ${repository}@${commitSha}`);

    return {
      success: true,
      message: `Enqueued ${generationType} documentation generation job.`,
      jobId: job.id,
      repository,
      commitSha,
      generationType,
    };
  }

  /**
   * Get list of generation runs
   */
  async getGenerations(status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.documentationVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          repository: true,
          commitSha: true,
          shortSha: true,
          commitMessage: true,
          branch: true,
          generationType: true,
          status: true,
          modelUsed: true,
          errorMessage: true,
          generationTimeMs: true,
          createdAt: true,
        },
      }),
      this.prisma.documentationVersion.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Retry a failed generation
   */
  async retryGeneration(id: string) {
    const doc = await this.prisma.documentationVersion.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundException(`Documentation version with id "${id}" not found.`);
    }

    const payload: GenerationJobPayload = {
      repository: doc.repository,
      commitSha: doc.commitSha,
      branch: doc.branch,
      generationType: doc.generationType as any,
      commitMessage: doc.commitMessage || undefined,
      commitAuthor: doc.commitAuthor || undefined,
      manualTrigger: true,
    };

    // Reset status to pending
    await this.prisma.documentationVersion.update({
      where: { id },
      data: {
        status: 'pending',
        errorMessage: null,
      },
    });

    const safeJobId = `${doc.repository.replace(/[\/:]/g, '_')}__${doc.commitSha}__retry_${Date.now()}`;
    const job = await this.queue.add(JOB_GENERATE_DOCS, payload, {
      jobId: safeJobId,
    });

    this.logger.log(`Retrying generation for ${doc.repository}@${doc.shortSha} (job ${job.id})`);

    return {
      success: true,
      message: `Retrying generation for commit ${doc.shortSha}`,
      jobId: job.id,
    };
  }
}
