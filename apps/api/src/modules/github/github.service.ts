import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

export interface RepositoryFile {
  path: string;
  size: number;
  type: string;
  sha: string;
  content?: string;
}

export interface FileDiff {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  content?: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private octokit: Octokit;

  // Patterns to ignore during codebase scanning
  private readonly IGNORED_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    'coverage',
    '.turbo',
    '.vscode',
    '.idea',
    'vendor',
    'public',
    'static',
    'assets',
    'temp',
    'tmp',
  ];

  private readonly IGNORED_EXTENSIONS = [
    '.lock',
    '-lock.json',
    '.lockb',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.webp',
    '.mp4',
    '.mp3',
    '.pdf',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.map',
    '.min.js',
    '.min.css',
    '.zip',
    '.tar',
    '.gz',
  ];

  constructor(private readonly configService: ConfigService) {
    this.initOctokit();
  }

  private initOctokit() {
    const appId = this.configService.get<string>('GITHUB_APP_ID');
    const privateKey = this.configService.get<string>('GITHUB_APP_PRIVATE_KEY');
    const installationId = this.configService.get<string>('GITHUB_APP_INSTALLATION_ID');
    const pat = this.configService.get<string>('GITHUB_PAT');

    if (appId && privateKey && installationId) {
      this.logger.log(`Initializing Octokit with GitHub App (App ID: ${appId}, Installation: ${installationId})`);
      // Parse private key if newlines are escaped
      const formattedKey = privateKey.includes('\\n') 
        ? privateKey.replace(/\\n/g, '\n') 
        : privateKey;

      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId,
          privateKey: formattedKey,
          installationId: Number(installationId),
        },
      });
    } else if (pat) {
      this.logger.log('Initializing Octokit with Personal Access Token (PAT)');
      this.octokit = new Octokit({ auth: pat });
    } else {
      this.logger.warn('No GitHub credentials provided. Initializing unauthenticated Octokit (rate limits apply).');
      this.octokit = new Octokit();
    }
  }

  private parseRepo(repo: string): { owner: string; repo: string } {
    const parts = repo.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repository format: "${repo}". Expected "owner/repo".`);
    }
    return { owner: parts[0], repo: parts[1] };
  }

  /**
   * Check if a file path matches ignore lists
   */
  public isFileIgnored(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    const segments = normalized.split('/');

    // Check directory exclusions
    for (const ignoredDir of this.IGNORED_DIRECTORIES) {
      if (segments.includes(ignoredDir)) {
        return true;
      }
    }

    // Check test directories or files
    if (
      normalized.includes('__tests__') ||
      normalized.endsWith('.spec.ts') ||
      normalized.endsWith('.test.ts') ||
      normalized.endsWith('.spec.js') ||
      normalized.endsWith('.test.js')
    ) {
      return true;
    }

    // Check extension exclusions
    for (const ext of this.IGNORED_EXTENSIONS) {
      if (normalized.endsWith(ext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fetch commit metadata
   */
  async getCommit(repoFullName: string, commitSha: string) {
    const { owner, repo } = this.parseRepo(repoFullName);
    try {
      const response = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commitSha,
      });

      return {
        sha: response.data.sha,
        shortSha: response.data.sha.substring(0, 7),
        message: response.data.commit.message,
        author: response.data.commit.author?.name || response.data.author?.login || 'Unknown',
        date: response.data.commit.author?.date ? new Date(response.data.commit.author.date) : new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch commit ${commitSha} for ${repoFullName}:`, error);
      throw error;
    }
  }

  /**
   * Compare two commits and get list of changed files and diff patches
   */
  async getCommitDiff(
    repoFullName: string,
    baseSha: string,
    headSha: string
  ): Promise<{ files: FileDiff[]; totalCommits: number }> {
    const { owner, repo } = this.parseRepo(repoFullName);
    try {
      const response = await this.octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${baseSha}...${headSha}`,
      });

      const files: FileDiff[] = [];
      for (const file of response.data.files || []) {
        if (this.isFileIgnored(file.filename)) {
          continue;
        }

        let content: string | undefined = undefined;
        // If file was added or modified and is under 50KB, fetch its full content
        if (file.status !== 'removed') {
          try {
            content = await this.getFileContent(repoFullName, file.filename, headSha);
          } catch (e) {
            this.logger.debug(`Could not fetch full content for ${file.filename}: ${e.message}`);
          }
        }

        files.push({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
          content,
        });
      }

      return {
        files,
        totalCommits: response.data.total_commits,
      };
    } catch (error) {
      this.logger.error(`Failed to compare commits ${baseSha}...${headSha}:`, error);
      throw error;
    }
  }

  /**
   * Fetch repository tree and filter for important code/config files
   */
  async getRepositoryTree(repoFullName: string, commitSha: string): Promise<RepositoryFile[]> {
    const { owner, repo } = this.parseRepo(repoFullName);
    try {
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: 'true',
      });

      const filtered: RepositoryFile[] = [];
      for (const item of response.data.tree) {
        if (item.type === 'blob' && item.path && !this.isFileIgnored(item.path)) {
          filtered.push({
            path: item.path,
            size: item.size || 0,
            type: item.type,
            sha: item.sha,
          });
        }
      }

      return filtered;
    } catch (error) {
      this.logger.error(`Failed to get tree for ${repoFullName}@${commitSha}:`, error);
      throw error;
    }
  }

  /**
   * Fetch raw UTF-8 content of a file
   */
  async getFileContent(repoFullName: string, path: string, ref: string): Promise<string> {
    const { owner, repo } = this.parseRepo(repoFullName);
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
        headers: { accept: 'application/vnd.github.v3.raw' },
      });

      if (typeof response.data === 'string') {
        return response.data;
      }
      return Buffer.from((response.data as any).content || '', 'base64').toString('utf8');
    } catch (error) {
      this.logger.error(`Failed to fetch file content for ${path}@${ref}:`, error);
      throw error;
    }
  }

  /**
   * Fetch important files for full documentation bootstrapping
   */
  async getImportantFilesContent(
    repoFullName: string,
    commitSha: string,
    maxTotalFiles = 40
  ): Promise<{ path: string; content: string }[]> {
    const tree = await this.getRepositoryTree(repoFullName, commitSha);

    // Prioritize key architectural files
    const priorityPatterns = [
      /package\.json$/,
      /schema\.prisma$/,
      /docker-compose\.ya?ml$/,
      /README\.md$/,
      /openapi\.ya?ml$/,
      /openapi\.json$/,
      /swagger\.json$/,
      /\.env\.example$/,
      /src\/main\.ts$/,
      /src\/app\.module\.ts$/,
      /src\/.*\.controller\.ts$/,
      /src\/.*\.service\.ts$/,
      /src\/.*\.model\.ts$/,
      /src\/.*\.entity\.ts$/,
      /src\/.*\.dto\.ts$/,
      /src\/.*\.schema\.ts$/,
      /pages\/.*\.tsx?$/,
      /app\/.*\/page\.tsx?$/,
      /app\/.*\/route\.ts$/,
    ];

    const sortedTree = [...tree].sort((a, b) => {
      const aPriority = priorityPatterns.findIndex((p) => p.test(a.path));
      const bPriority = priorityPatterns.findIndex((p) => p.test(b.path));
      const aScore = aPriority === -1 ? 999 : aPriority;
      const bScore = bPriority === -1 ? 999 : bPriority;
      return aScore - bScore;
    });

    const results: { path: string; content: string }[] = [];
    const filesToFetch = sortedTree.slice(0, maxTotalFiles);

    for (const file of filesToFetch) {
      // Skip files over 80KB to conserve LLM context window
      if (file.size > 80 * 1024) continue;

      try {
        const content = await this.getFileContent(repoFullName, file.path, commitSha);
        results.push({ path: file.path, content });
      } catch (err) {
        this.logger.warn(`Could not load ${file.path}: ${err.message}`);
      }
    }

    return results;
  }
}
