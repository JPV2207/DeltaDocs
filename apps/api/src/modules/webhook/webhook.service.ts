import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { DOC_GENERATION_QUEUE, JOB_GENERATE_DOCS } from '../queue/queue.constants';
import { GenerationJobPayload } from '@autodocs/shared';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(DOC_GENERATION_QUEUE) private readonly queue: Queue<GenerationJobPayload>
  ) {}

  /**
   * Verify GitHub HMAC-SHA256 signature
   */
  public verifySignature(signature: string | undefined, payload: Buffer | string): boolean {
    const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');

    // If no secret configured in dev mode, allow but warn
    if (!secret || secret === 'autodocs-local-secret') {
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        return true;
      }
    }

    if (!signature) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Process incoming GitHub push event
   */
  async handlePushEvent(event: any) {
    const ref = event.ref; // e.g. "refs/heads/main"
    const targetBranch = this.configService.get<string>('DEFAULT_BRANCH', 'main');
    const expectedRef = `refs/heads/${targetBranch}`;

    if (ref !== expectedRef) {
      this.logger.log(`Ignoring push to ref "${ref}" (watching "${expectedRef}")`);
      return {
        queued: false,
        reason: `Ignored push to branch ${ref}. System only tracks ${expectedRef}.`,
      };
    }

    const repository = event.repository?.full_name;
    const commitSha = event.after;
    const headCommit = event.head_commit;
    const previousCommitSha = event.before;

    if (!repository || !commitSha || commitSha === '0000000000000000000000000000000000000000') {
      return {
        queued: false,
        reason: 'Branch deletion or invalid commit SHA.',
      };
    }

    // Determine changed files
    const changedFiles: string[] = [];
    for (const commit of event.commits || []) {
      if (commit.added) changedFiles.push(...commit.added);
      if (commit.modified) changedFiles.push(...commit.modified);
      if (commit.removed) changedFiles.push(...commit.removed);
    }
    const uniqueFiles = Array.from(new Set(changedFiles));

    // Check if previous documentation baseline exists for this repository
    const existingDoc = await this.prisma.documentationVersion.findFirst({
      where: {
        repository,
        status: 'success',
      },
    });

    const generationType = existingDoc ? 'incremental' : 'full';

    const jobPayload: GenerationJobPayload = {
      repository,
      commitSha,
      branch: targetBranch,
      generationType,
      previousCommitSha: previousCommitSha && previousCommitSha !== '0000000000000000000000000000000000000000' ? previousCommitSha : undefined,
      commitMessage: headCommit?.message || 'Push event on ' + targetBranch,
      commitAuthor: headCommit?.author?.name || event.pusher?.name || 'GitHub Committer',
      commitDate: headCommit?.timestamp || new Date().toISOString(),
      changedFiles: uniqueFiles,
    };

    // Quickly enqueue into BullMQ (BullMQ v5 does not permit ':' in custom job IDs)
    const safeJobId = `${repository.replace(/[\/:]/g, '_')}__${commitSha}__${Date.now()}`;
    const job = await this.queue.add(JOB_GENERATE_DOCS, jobPayload, {
      jobId: safeJobId,
      removeOnComplete: true,
    });

    this.logger.log(`Enqueued ${generationType} documentation generation job ${job.id} for ${repository}@${commitSha.substring(0, 7)}`);

    return {
      queued: true,
      jobId: job.id,
      generationType,
      repository,
      commitSha,
    };
  }
}
