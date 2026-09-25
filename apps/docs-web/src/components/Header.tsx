'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { VersionSummaryDto } from '@autodocs/shared';
import { VersionSelector } from './VersionSelector';
import { BookOpen, GitCommit, Settings, Sun, Moon, Github } from 'lucide-react';

interface HeaderProps {
  currentSha?: string;
  repository?: string;
  branch?: string;
  versions?: VersionSummaryDto[];
  isHistorical?: boolean;
}

export function Header({
  currentSha,
  repository = 'repository',
  branch = 'main',
  versions = [],
  isHistorical = false,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-85 transition">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent font-extrabold">
              AutoDocs
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
            <Github className="h-4 w-4" />
            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">{repository}</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-xs text-zinc-600 dark:text-zinc-300">
              {branch}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Version Selector */}
          <VersionSelector
            currentSha={currentSha}
            versions={versions}
            isHistorical={isHistorical}
          />

          {/* Admin Dashboard Link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Admin</span>
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
