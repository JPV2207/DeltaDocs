'use client';

import React from 'react';
import {
  FileText,
  Layers,
  Network,
  Database,
  History,
  AlertTriangle,
  Code,
  Zap,
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
    { name: 'Overview', href: '#overview', icon: FileText },
    { name: 'Architecture', href: '#architecture', icon: Layers },
    { name: 'API Reference', href: '#api', icon: Network },
    { name: 'Database Models', href: '#database', icon: Database },
    { name: 'Changelog', href: '#changelog', icon: History },
    {
      name: 'Breaking Changes',
      href: '#breaking-changes',
      icon: AlertTriangle,
      badge: hasBreakingChanges ? 'Alert' : undefined,
    },
    { name: 'Raw Markdown', href: '#raw-markdown', icon: Code },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:block sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pr-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Documentation
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Telemetry metadata */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Generation Metadata</span>
          </div>
          <div className="space-y-1 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="text-zinc-700 dark:text-zinc-300 uppercase">{generationType || 'Full'}</span>
            </div>
            {modelUsed && (
              <div className="flex justify-between">
                <span>Model:</span>
                <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{modelUsed}</span>
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
