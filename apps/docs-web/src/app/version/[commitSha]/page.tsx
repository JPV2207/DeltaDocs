import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchDocByCommit, fetchVersionsList } from '../../../lib/api';
import { Header } from '../../../components/Header';
import { Sidebar } from '../../../components/Sidebar';
import { DocContent } from '../../../components/DocContent';
import { Clock, ArrowLeft, AlertCircle } from 'lucide-react';

interface VersionPageProps {
  params: Promise<{
    commitSha: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function VersionPage({ params }: VersionPageProps) {
  const { commitSha } = await params;
  const [doc, versions] = await Promise.all([
    fetchDocByCommit(commitSha),
    fetchVersionsList(),
  ]);

  if (!doc) {
    notFound();
  }

  const hasBreakingChanges = (doc.content?.sections?.breakingChanges?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col">
      {/* Historical Snapshot Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>
          Viewing historical documentation snapshot for commit <code className="font-mono font-bold">{doc.shortSha}</code>.
        </span>
        <Link
          href="/"
          className="ml-2 font-bold underline hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-1"
        >
          View latest version &rarr;
        </Link>
      </div>

      <Header
        currentSha={doc.commitSha}
        repository={doc.repository}
        branch={doc.branch}
        versions={versions}
        isHistorical={true}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex gap-8">
        <Sidebar
          modelUsed={doc.modelUsed}
          generationTimeMs={doc.generationTimeMs}
          generationType={doc.generationType}
          hasBreakingChanges={hasBreakingChanges}
        />

        <main className="flex-1 min-w-0">
          <DocContent doc={doc} />
        </main>
      </div>
    </div>
  );
}
