import { DocumentationContent } from '../schemas/documentation.schema';

export type GenerationType = 'full' | 'incremental';
export type GenerationStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface DocumentationVersionDto {
  id: string;
  commitSha: string;
  shortSha: string;
  commitMessage: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  branch: string;
  repository: string;
  generationType: GenerationType;
  status: GenerationStatus;
  modelUsed: string | null;
  changedFiles: string[];
  content: DocumentationContent | null;
  rawMarkdown: string | null;
  errorMessage: string | null;
  generationTimeMs: number | null;
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VersionSummaryDto {
  id: string;
  commitSha: string;
  shortSha: string;
  commitMessage: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  branch: string;
  repository: string;
  generationType: GenerationType;
  status: GenerationStatus;
  changedFilesCount: number;
  generationTimeMs: number | null;
  createdAt: string;
}

export interface GenerationJobPayload {
  repository: string; // e.g. "owner/repo"
  commitSha: string;
  branch: string;
  generationType: GenerationType;
  commitMessage?: string;
  commitAuthor?: string;
  commitDate?: string;
  previousCommitSha?: string;
  changedFiles?: string[];
  manualTrigger?: boolean;
}

export interface GenerationStatsDto {
  totalVersions: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageGenerationTimeMs: number;
  lastGeneratedAt: string | null;
  activeRepository: string;
}

export interface ManualGenerateRequestDto {
  repository?: string;
  commitSha?: string;
  branch?: string;
  generationType?: GenerationType;
  force?: boolean;
}

export interface AdminGenerationHistoryItem {
  id: string;
  repository: string;
  commitSha: string;
  shortSha: string;
  commitMessage: string | null;
  branch: string;
  generationType: GenerationType;
  status: GenerationStatus;
  modelUsed: string | null;
  errorMessage: string | null;
  generationTimeMs: number | null;
  createdAt: string;
}
