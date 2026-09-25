'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchAdminGenerations,
  fetchDocStats,
  triggerManualGeneration,
  retryFailedGeneration,
} from '../../lib/api';
import {
  AdminGenerationHistoryItem,
  GenerationStatsDto,
  GenerationType,
} from '@autodocs/shared';
import {
  Settings,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  ArrowLeft,
  RefreshCw,
  GitCommit,
  Layers,
} from 'lucide-react';

export default function AdminPage() {
  const [generations, setGenerations] = useState<AdminGenerationHistoryItem[]>([]);
  const [stats, setStats] = useState<GenerationStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form inputs
  const [customRepo, setCustomRepo] = useState('');
  const [customSha, setCustomSha] = useState('');
  const [genType, setGenType] = useState<GenerationType>('full');

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        fetchAdminGenerations(),
        fetchDocStats(),
      ]);
      setGenerations(historyData.items);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    setMessage(null);
    try {
      const res = await triggerManualGeneration({
        repository: customRepo.trim() || undefined,
        commitSha: customSha.trim() || undefined,
        generationType: genType,
      });
      setMessage({ text: `Job enqueued successfully! Job ID: ${res.jobId}`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to trigger generation', type: 'error' });
    } finally {
      setTriggering(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    setMessage(null);
    try {
      await retryFailedGeneration(id);
      setMessage({ text: 'Retry job enqueued successfully.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Retry failed', type: 'error' });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <span>AutoDocs Admin Console</span>
              </h1>
              <p className="text-xs text-zinc-400">Trigger jobs, monitor generation queue, and retry failures</p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Alerts */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border-red-800 text-red-300'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Stats Metrics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-xs text-zinc-400">Total Versions</div>
              <div className="text-2xl font-bold font-mono">{stats.totalVersions}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-xs text-zinc-400">Successful</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">{stats.successfulGenerations}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-xs text-zinc-400">Failed</div>
              <div className="text-2xl font-bold font-mono text-red-400">{stats.failedGenerations}</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-xs text-zinc-400">Avg Generation Time</div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {(stats.averageGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        )}

        {/* Manual Trigger Form */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Play className="h-4 w-4 text-emerald-400" />
            <span>Manually Trigger Documentation Generation</span>
          </div>

          <form onSubmit={handleTrigger} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Repository (owner/repo)</label>
              <input
                type="text"
                placeholder={stats?.activeRepository || 'owner/repo'}
                value={customRepo}
                onChange={(e) => setCustomRepo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Commit SHA / Ref (optional)</label>
              <input
                type="text"
                placeholder="HEAD (latest commit)"
                value={customSha}
                onChange={(e) => setCustomSha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Generation Mode</label>
              <select
                value={genType}
                onChange={(e) => setGenType(e.target.value as GenerationType)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                <option value="full">Full / Bootstrap Generation</option>
                <option value="incremental">Incremental Update</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={triggering}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                <Zap className={`h-4 w-4 ${triggering ? 'animate-bounce' : ''}`} />
                <span>{triggering ? 'Enqueuing Job...' : 'Enqueue Documentation Job'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Generation History Table */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-800 font-bold text-sm flex items-center justify-between">
            <span>Generation Audit History</span>
            <span className="text-xs text-zinc-400 font-mono">{generations.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Commit</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {generations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-zinc-500">
                      No generation runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  generations.map((item) => {
                    const statusBadge =
                      item.status === 'success' ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">
                          success
                        </span>
                      ) : item.status === 'processing' ? (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-semibold uppercase text-[10px] animate-pulse">
                          processing
                        </span>
                      ) : item.status === 'failed' ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">
                          failed
                        </span>
                      ) : (
                        <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase text-[10px]">
                          {item.status}
                        </span>
                      );

                    return (
                      <tr key={item.id} className="hover:bg-zinc-850/40">
                        <td className="p-3 font-mono font-medium text-zinc-200">
                          <Link href={`/version/${item.commitSha}`} className="hover:text-blue-400 underline">
                            {item.shortSha}
                          </Link>
                        </td>
                        <td className="p-3 uppercase font-mono text-[11px] text-zinc-400">{item.generationType}</td>
                        <td className="p-3">{statusBadge}</td>
                        <td className="p-3 text-zinc-300 max-w-xs truncate" title={item.commitMessage || ''}>
                          {item.commitMessage || '-'}
                          {item.errorMessage && (
                            <div className="text-red-400 text-[10px] truncate" title={item.errorMessage}>
                              Err: {item.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-zinc-400 text-[11px] truncate max-w-[100px]">
                          {item.modelUsed || '-'}
                        </td>
                        <td className="p-3 font-mono text-zinc-400">
                          {item.generationTimeMs ? `${(item.generationTimeMs / 1000).toFixed(1)}s` : '-'}
                        </td>
                        <td className="p-3 text-zinc-400 text-[11px]">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="p-3 text-right">
                          {item.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingId === item.id}
                              className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900/80 text-[11px] font-semibold transition"
                            >
                              {retryingId === item.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
