import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { DocumentationVersionDto, VersionSummaryDto, GenerationStatsDto } from '@autodocs/shared';

@Injectable()
export class DocumentationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  private resolveRepo(repo?: string): string {
    return repo || this.configService.get<string>('DEFAULT_REPOSITORY', 'example/repo');
  }

  /**
   * Get the latest successful documentation version for a repository
   */
  async getLatestDocumentation(repo?: string): Promise<DocumentationVersionDto> {
    const repository = this.resolveRepo(repo);

    const doc = await this.prisma.documentationVersion.findFirst({
      where: {
        repository,
        status: 'success',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!doc) {
      throw new NotFoundException(`No documentation found for repository "${repository}". Trigger a full generation to bootstrap.`);
    }

    return this.mapToDto(doc);
  }

  /**
   * Get list of historical documentation versions
   */
  async getVersions(repo?: string, page = 1, limit = 20): Promise<{ versions: VersionSummaryDto[]; total: number }> {
    const repository = this.resolveRepo(repo);
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      this.prisma.documentationVersion.findMany({
        where: { repository },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          commitSha: true,
          shortSha: true,
          commitMessage: true,
          commitAuthor: true,
          commitDate: true,
          branch: true,
          repository: true,
          generationType: true,
          status: true,
          changedFiles: true,
          generationTimeMs: true,
          createdAt: true,
        },
      }),
      this.prisma.documentationVersion.count({ where: { repository } }),
    ]);

    return {
      versions: versions.map((v) => ({
        id: v.id,
        commitSha: v.commitSha,
        shortSha: v.shortSha,
        commitMessage: v.commitMessage,
        commitAuthor: v.commitAuthor,
        commitDate: v.commitDate ? v.commitDate.toISOString() : null,
        branch: v.branch,
        repository: v.repository,
        generationType: v.generationType as any,
        status: v.status as any,
        changedFilesCount: v.changedFiles.length,
        generationTimeMs: v.generationTimeMs,
        createdAt: v.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Get a specific documentation version by commit SHA (or full/short SHA)
   */
  async getVersionBySha(commitSha: string, repo?: string): Promise<DocumentationVersionDto> {
    const repository = this.resolveRepo(repo);

    const doc = await this.prisma.documentationVersion.findFirst({
      where: {
        repository,
        OR: [
          { commitSha },
          { shortSha: commitSha },
        ],
      },
    });

    if (!doc) {
      throw new NotFoundException(`Documentation version for commit "${commitSha}" not found in repository "${repository}".`);
    }

    return this.mapToDto(doc);
  }

  /**
   * Aggregate statistics on generations
   */
  async getStats(repo?: string): Promise<GenerationStatsDto> {
    const repository = this.resolveRepo(repo);

    const [totalVersions, successfulGenerations, failedGenerations, avgAggregate, lastDoc] = await Promise.all([
      this.prisma.documentationVersion.count({ where: { repository } }),
      this.prisma.documentationVersion.count({ where: { repository, status: 'success' } }),
      this.prisma.documentationVersion.count({ where: { repository, status: 'failed' } }),
      this.prisma.documentationVersion.aggregate({
        where: { repository, status: 'success', generationTimeMs: { not: null } },
        _avg: { generationTimeMs: true },
      }),
      this.prisma.documentationVersion.findFirst({
        where: { repository, status: 'success' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalVersions,
      successfulGenerations,
      failedGenerations,
      averageGenerationTimeMs: Math.round(avgAggregate._avg.generationTimeMs || 0),
      lastGeneratedAt: lastDoc ? lastDoc.createdAt.toISOString() : null,
      activeRepository: repository,
    };
  }

  private mapToDto(doc: any): DocumentationVersionDto {
    return {
      id: doc.id,
      commitSha: doc.commitSha,
      shortSha: doc.shortSha,
      commitMessage: doc.commitMessage,
      commitAuthor: doc.commitAuthor,
      commitDate: doc.commitDate ? doc.commitDate.toISOString() : null,
      branch: doc.branch,
      repository: doc.repository,
      generationType: doc.generationType,
      status: doc.status,
      modelUsed: doc.modelUsed,
      changedFiles: doc.changedFiles,
      content: doc.content,
      rawMarkdown: doc.rawMarkdown,
      errorMessage: doc.errorMessage,
      generationTimeMs: doc.generationTimeMs,
      tokenUsage: doc.tokenUsage,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
