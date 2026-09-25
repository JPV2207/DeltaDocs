import React from 'react';
import Link from 'next/link';
import { fetchLatestDoc, fetchVersionsList } from '../lib/api';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { DocContent } from '../components/DocContent';
import { BookOpen, Sparkles, ArrowRight, Settings, Terminal, GitBranch } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [doc, versions] = await Promise.all([
    fetchLatestDoc(),
    fetchVersionsList(),
  ]);

  if (!doc) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <header className="h-16 border-b border-zinc-850 flex items-center justify-between px-6 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">
              AutoDocs
            </span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Admin Console</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Automated Documentation Engine Ready</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              No Documentation Generated Yet
            </h1>

            <p className="text-zinc-400 text-base leading-relaxed">
              AutoDocs automatically creates comprehensive, versioned technical documentation whenever code is pushed to your Git repository.
            </p>

            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400" />
                <span>How to Bootstrap Your First Documentation:</span>
              </div>
              <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside leading-relaxed font-mono">
                <li>
                  <strong>Option A:</strong> Go to the <Link href="/admin" className="text-blue-400 underline">Admin Console</Link> and click <em>"Trigger Full Bootstrap Generation"</em>.
                </li>
                <li>
                  <strong>Option B:</strong> Push a commit to your tracked Git branch (<code className="bg-zinc-800 px-1 py-0.5 rounded text-amber-300">main</code>) with the GitHub Webhook configured.
                </li>
                <li>
                  <strong>Option C:</strong> Run the curl command:
                  <div className="mt-1.5 p-2.5 rounded bg-black border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto">
                    curl -X POST http://localhost:3001/api/admin/generate -H "Content-Type: application/json" -d &apos;&#123;&quot;generationType&quot;: &quot;full&quot;&#125;&apos;
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/30"
              >
                <span>Open Admin Console</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const hasBreakingChanges = (doc.content?.sections?.breakingChanges?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col">
      <Header
        currentSha={doc.commitSha}
        repository={doc.repository}
        branch={doc.branch}
        versions={versions}
        isHistorical={false}
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
