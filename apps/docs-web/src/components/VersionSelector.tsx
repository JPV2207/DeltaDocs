'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { VersionSummaryDto } from '@autodocs/shared';
import { GitCommit, ChevronDown, Check, Clock, User, Sparkles, RefreshCw } from 'lucide-react';

interface VersionSelectorProps {
  currentSha?: string;
  versions: VersionSummaryDto[];
  isHistorical?: boolean;
}

export function VersionSelector({ currentSha, versions = [], isHistorical }: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeShortSha = currentSha ? currentSha.substring(0, 7) : 'latest';
  const latestSha = versions[0]?.commitSha;
  const isCurrentlyLatest = !isHistorical || (latestSha && currentSha === latestSha);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 text-xs font-mono font-medium hover:border-zinc-300 dark:hover:border-zinc-700 transition"
      >
        <GitCommit className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-semibold">{activeShortSha}</span>
        {isCurrentlyLatest ? (
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
            Latest
          </span>
        ) : (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
            Historical
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[460px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Commit Version History</span>
            <span className="text-[10px] font-normal text-zinc-400">{versions.length} versions</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-850 mt-1">
            {versions.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">No versions available yet.</div>
            ) : (
              versions.map((ver, idx) => {
                const isSelected = currentSha === ver.commitSha || (!currentSha && idx === 0);
                const isLatestItem = idx === 0;
                const linkHref = isLatestItem ? '/' : `/version/${ver.commitSha}`;

                return (
                  <Link
                    key={ver.id}
                    href={linkHref}
                    onClick={() => setIsOpen(false)}
                    className={`block p-2.5 rounded-lg text-left transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        <span>{ver.shortSha}</span>
                        {isLatestItem && (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-sans font-medium">
                            Latest
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-sans uppercase font-bold ${
                            ver.generationType === 'full'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {ver.generationType}
                        </span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-sans line-clamp-1 mt-1">
                      {ver.commitMessage || 'No commit message'}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ver.commitAuthor || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ver.commitDate ? new Date(ver.commitDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
