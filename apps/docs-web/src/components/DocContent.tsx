'use client';

import React, { useState } from 'react';
import { DocumentationVersionDto } from '@autodocs/shared';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  FileText,
  Layers,
  Network,
  Database,
  History,
  AlertTriangle,
  Code,
  CheckCircle2,
  GitCommit,
  User,
  Calendar,
  Key,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DocContentProps {
  doc: DocumentationVersionDto;
}

export function DocContent({ doc }: DocContentProps) {
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const content = doc.content;

  if (!content) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p>No structured content available for this commit.</p>
        {doc.rawMarkdown && (
          <div className="mt-4 text-left">
            <MarkdownRenderer content={doc.rawMarkdown} />
          </div>
        )}
      </div>
    );
  }

  const { title, changelog, sections } = content;
  const hasBreakingChanges = sections.breakingChanges && sections.breakingChanges.length > 0;

  return (
    <div className="space-y-12 pb-24">
      {/* Title & Changelog Header Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900/60 dark:to-zinc-950 p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                doc.generationType === 'full'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {doc.generationType} generation
            </span>
          </div>
        </div>

        {/* Commit Details Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <span className="flex items-center gap-1.5 font-mono">
            <GitCommit className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{doc.shortSha}</span>
          </span>
          {doc.commitAuthor && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              <span>{doc.commitAuthor}</span>
            </span>
          )}
          {doc.commitDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>{new Date(doc.commitDate).toLocaleString()}</span>
            </span>
          )}
        </div>

        {/* Changelog Box */}
        {changelog && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-sm text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 text-xs mb-1">
              <History className="h-3.5 w-3.5" />
              <span>Commit Changelog</span>
            </div>
            <p className="leading-relaxed">{changelog}</p>
          </div>
        )}
      </div>

      {/* Breaking Changes Warning (if any) */}
      {hasBreakingChanges && (
        <section id="breaking-changes" className="scroll-mt-24">
          <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-lg">
              <ShieldAlert className="h-5 w-5" />
              <h2>Breaking Changes Detected</h2>
            </div>
            <div className="space-y-3">
              {sections.breakingChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-950 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{change.affectedArea}</span>
                    <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                      {change.impact} impact
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{change.description}</p>
                  {change.remediation && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-lg">
                      <strong className="text-zinc-700 dark:text-zinc-300">Remediation:</strong> {change.remediation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {sections.migrationNotes && (
              <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900/40 text-sm text-zinc-800 dark:text-zinc-200">
                <span className="font-semibold">Migration Notes:</span> {sections.migrationNotes}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section 1: Overview */}
      <section id="overview" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Overview</h2>
        </div>
        <div className="leading-relaxed">
          <MarkdownRenderer content={sections.overview} />
        </div>
      </section>

      {/* Section 2: Architecture */}
      <section id="architecture" className="scroll-mt-24 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <Layers className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Architecture</h2>
        </div>

        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{sections.architecture.summary}</p>

        {/* Diagram (Mermaid / ASCII) */}
        {sections.architecture.diagram && (
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-200 font-mono text-xs overflow-x-auto">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-2">System Topology</div>
            <pre className="whitespace-pre">{sections.architecture.diagram}</pre>
          </div>
        )}

        {/* Component Breakdown Cards */}
        {sections.architecture.components && sections.architecture.components.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Component Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.architecture.components.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{comp.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {comp.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{comp.description}</p>
                  {comp.filePaths.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {comp.filePaths.map((fp, i) => (
                        <span key={i} className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                          {fp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 3: API Reference */}
      <section id="api" className="scroll-mt-24 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <Network className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">API Reference</h2>
        </div>

        <p className="text-sm text-zinc-700 dark:text-zinc-300">{sections.api.summary}</p>

        <div className="space-y-4">
          {sections.api.endpoints && sections.api.endpoints.length > 0 ? (
            sections.api.endpoints.map((ep, idx) => {
              const methodColor =
                ep.method === 'GET'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  : ep.method === 'POST'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                  : ep.method === 'PUT' || ep.method === 'PATCH'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-300 dark:border-red-800';

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50/60 dark:bg-zinc-850/40 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-md border ${methodColor}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ep.path}</span>
                    </div>
                    {ep.authentication && (
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Auth Required
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <p className="text-zinc-700 dark:text-zinc-300">{ep.description}</p>

                    {ep.parameters && ep.parameters.length > 0 && (
                      <div>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">Parameters:</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border border-zinc-200 dark:border-zinc-800 rounded">
                            <thead className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500">
                              <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">In</th>
                                <th className="p-2">Type</th>
                                <th className="p-2">Required</th>
                                <th className="p-2">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                              {ep.parameters.map((p, pIdx) => (
                                <tr key={pIdx}>
                                  <td className="p-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">{p.name}</td>
                                  <td className="p-2 text-zinc-500">{p.in}</td>
                                  <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{p.type}</td>
                                  <td className="p-2">{p.required ? 'Yes' : 'No'}</td>
                                  <td className="p-2 text-zinc-600 dark:text-zinc-400">{p.description || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-zinc-500 italic">No API endpoints registered.</p>
          )}
        </div>
      </section>

      {/* Section 4: Database Models */}
      <section id="database" className="scroll-mt-24 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <Database className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Database Models</h2>
        </div>

        <p className="text-sm text-zinc-700 dark:text-zinc-300">{sections.database.summary}</p>

        <div className="space-y-6">
          {sections.database.models && sections.database.models.length > 0 ? (
            sections.database.models.map((model, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
              >
                <div className="p-4 bg-zinc-50/60 dark:bg-zinc-850/40 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{model.name}</span>
                    {model.tableName && (
                      <span className="text-xs text-zinc-400 font-mono">({model.tableName})</span>
                    )}
                  </div>
                  {model.description && <span className="text-xs text-zinc-500">{model.description}</span>}
                </div>

                <div className="overflow-x-auto p-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-medium">Field</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Attributes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                      {model.fields.map((f, fIdx) => (
                        <tr key={fIdx}>
                          <td className="py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            {f.isPrimaryKey && <Key className="h-3 w-3 text-amber-500 inline" />}
                            <span>{f.name}</span>
                          </td>
                          <td className="py-2 font-mono text-blue-600 dark:text-blue-400">{f.type}</td>
                          <td className="py-2 space-x-1.5">
                            {f.isPrimaryKey && (
                              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                PK
                              </span>
                            )}
                            {f.isUnique && (
                              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
                                UNIQUE
                              </span>
                            )}
                            {f.isNullable && (
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-[10px]">
                                NULLABLE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 italic">No database models registered.</p>
          )}
        </div>
      </section>

      {/* Section 5: Raw Markdown Toggle */}
      <section id="raw-markdown" className="scroll-mt-24 space-y-4">
        <button
          onClick={() => setShowRawMarkdown(!showRawMarkdown)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <Code className="h-4 w-4 text-zinc-500" />
          <span>{showRawMarkdown ? 'Hide Complete Raw Markdown' : 'View Complete Standalone Markdown'}</span>
          {showRawMarkdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showRawMarkdown && (
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-in fade-in">
            <MarkdownRenderer content={content.fullMarkdown} />
          </div>
        )}
      </section>
    </div>
  );
}
