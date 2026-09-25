import {
  DocumentationVersionDto,
  VersionSummaryDto,
  GenerationStatsDto,
  ManualGenerateRequestDto,
  AdminGenerationHistoryItem,
} from '@autodocs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchLatestDoc(repository?: string): Promise<DocumentationVersionDto | null> {
  const url = new URL(`${API_BASE}/api/docs/latest`);
  if (repository) url.searchParams.set('repository', repository);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch latest doc: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching latest doc:', error);
    return null;
  }
}

export async function fetchDocByCommit(commitSha: string, repository?: string): Promise<DocumentationVersionDto | null> {
  const url = new URL(`${API_BASE}/api/docs/version/${commitSha}`);
  if (repository) url.searchParams.set('repository', repository);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch doc for commit ${commitSha}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Error fetching commit doc ${commitSha}:`, error);
    return null;
  }
}

export async function fetchVersionsList(repository?: string): Promise<VersionSummaryDto[]> {
  const url = new URL(`${API_BASE}/api/docs/versions`);
  if (repository) url.searchParams.set('repository', repository);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.versions || [];
  } catch (error) {
    console.error('Error fetching versions:', error);
    return [];
  }
}

export async function fetchDocStats(repository?: string): Promise<GenerationStatsDto | null> {
  const url = new URL(`${API_BASE}/api/docs/stats`);
  if (repository) url.searchParams.set('repository', repository);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

export async function triggerManualGeneration(params: ManualGenerateRequestDto) {
  const res = await fetch(`${API_BASE}/api/admin/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to trigger generation');
  }
  return await res.json();
}

export async function fetchAdminGenerations(): Promise<{ items: AdminGenerationHistoryItem[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/generations`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return await res.json();
  } catch (error) {
    console.error('Error fetching admin generations:', error);
    return { items: [], total: 0 };
  }
}

export async function retryFailedGeneration(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/generations/${id}/retry`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to retry generation');
  }
  return await res.json();
}
