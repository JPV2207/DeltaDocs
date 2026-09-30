'use client';

import React from 'react';
import {
  FileText,
  BookOpen,
  Layers,
  Network,
  Database,
  Code,
  Zap,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface SidebarProps {
  modelUsed?: string | null;
  generationTimeMs?: number | null;
  generationType?: string;
  hasBreakingChanges?: boolean;
}

export function Sidebar({
  modelUsed,
  generationTimeMs,
  generationType,
  hasBreakingChanges,
}: SidebarProps) {
  const navItems = [
    { name: 'Overview & Guide', href: '#overview', icon: BookOpen },
    { name: 'Domain Theory', href: '#theory', icon: Sparkles },
    { name: 'Architecture', href: '#architecture', icon: Layers },
    { name: 'API Reference', href: '#api', icon: Network },
    { name: 'Database Models', href: '#database', icon: Database },
    { name: 'Full Markdown Spec', href: '#markdown', icon: FileText },
  ];

  return (
    <aside className="w-60 shrink-0 hidden lg:block sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pr-2">
      <div className="space-y-6">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5 px-3">
            Navigation
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-zinc-400 group-hover:text-blue-500 transition" />
                    <span>{item.name}</span>
                  </div>
                </a>
              );
            })}
          </nav>
        </div>

        {hasBreakingChanges && (
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-400 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>Breaking changes in this version</span>
          </div>
        )}

        {/* Telemetry metadata card */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Engine Telemetry</span>
          </div>
          <div className="space-y-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="text-zinc-700 dark:text-zinc-300 uppercase font-semibold">{generationType || 'Full'}</span>
            </div>
            {modelUsed && (
              <div className="flex justify-between">
                <span>Model:</span>
                <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[110px]" title={modelUsed}>
                  {modelUsed}
                </span>
              </div>
            )}
            {generationTimeMs && (
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="text-zinc-700 dark:text-zinc-300">{(generationTimeMs / 1000).toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
