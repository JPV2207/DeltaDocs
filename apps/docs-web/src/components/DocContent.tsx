'use client';

import React, { useState, useEffect } from 'react';
import { DocumentationVersionDto } from '@autodocs/shared';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  BookOpen,
  FileText,
  Sparkles,
  GitCommit,
  User,
  Calendar,
  Code,
  Copy,
  Check,
  Search,
  Layers,
  Network,
  Database,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Wrench,
  Rocket,
  Zap,
  ArrowRight,
  FileCode,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';

interface DocContentProps {
  doc: DocumentationVersionDto;
}

type TabType = 'overview' | 'theory' | 'architecture' | 'api' | 'database' | 'markdown';

export function DocContent({ doc }: DocContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [apiSearch, setApiSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<number, boolean>>({});

  // Sync tab with URL hash if present
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['overview', 'theory', 'architecture', 'api', 'database', 'markdown'].includes(hash)) {
        setActiveTab(hash as TabType);
      } else if (hash === 'breaking-changes') {
        setActiveTab('overview');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const copyToClipboard = (text: string, type: 'code' | 'markdown') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  };

  const toggleEndpoint = (index: number) => {
    setExpandedEndpoints((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const content = doc.content;
  if (!content) {
    return (
      <div className="p-12 text-center text-zinc-500 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <Info className="h-8 w-8 mx-auto text-zinc-400 mb-3" />
        <p className="font-medium">No structured content available for this commit.</p>
        {doc.rawMarkdown && (
          <div className="mt-6 text-left">
            <MarkdownRenderer content={doc.rawMarkdown} />
          </div>
        )}
      </div>
    );
  }

  const { title, changelog, sections } = content;
  const changeType = sections.changeType || 'general';
  const developerGuide = sections.developerGuide;
  const patchDetails = sections.patchDetails;
  const hasBreakingChanges = sections.breakingChanges && sections.breakingChanges.length > 0;

  // Filter API endpoints
  const filteredEndpoints = (sections.api.endpoints || []).filter((ep) => {
    const matchesSearch =
      ep.path.toLowerCase().includes(apiSearch.toLowerCase()) ||
      ep.description.toLowerCase().includes(apiSearch.toLowerCase());
    const matchesMethod = selectedMethod === 'ALL' || ep.method.toUpperCase() === selectedMethod;
    return matchesSearch && matchesMethod;
  });

  // Parse workflow text into structured step cards if present
  const parseWorkflows = (workflowText?: string) => {
    if (!workflowText) return [];
    const lines = workflowText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const steps: { number: number; text: string }[] = [];
    lines.forEach((line) => {
      const match = line.match(/^(\d+)[\.\)]\s*(.*)$/);
      if (match) {
        steps.push({ number: parseInt(match[1], 10), text: match[2] });
      } else if (line.startsWith('-') || line.startsWith('*')) {
        steps.push({ number: steps.length + 1, text: line.replace(/^[-*]\s*/, '') });
      } else {
        steps.push({ number: steps.length + 1, text: line });
      }
    });
    return steps;
  };

  const workflowSteps = parseWorkflows(sections.theory?.workflows);

  return (
    <div className="space-y-8 pb-24">
      {/* 1. Sleek Modern Header Card */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-b from-zinc-50/70 to-white dark:from-zinc-900/40 dark:to-zinc-950 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Scope Badge */}
              {changeType === 'feature' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Rocket className="h-3 w-3" />
                  Feature Release
                </span>
              ) : changeType === 'fix' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Wrench className="h-3 w-3" />
                  Bug Fix / Patch
                </span>
              ) : changeType === 'refactor' || changeType === 'perf' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Zap className="h-3 w-3" />
                  Optimization / Refactor
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Sparkles className="h-3 w-3" />
                  General Update
                </span>
              )}

              {/* Generation Mode Badge */}
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                {doc.generationType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
          </div>
        </div>

        {/* Commit Details Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <span className="flex items-center gap-1.5 font-mono text-zinc-700 dark:text-zinc-300">
            <GitCommit className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold">{doc.shortSha}</span>
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
              <span>{new Date(doc.commitDate).toLocaleDateString()}</span>
            </span>
          )}
          {doc.modelUsed && (
            <span className="flex items-center gap-1.5 font-mono text-zinc-500">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>{doc.modelUsed}</span>
            </span>
          )}
        </div>

        {/* Changelog Callout */}
        {changelog && (
          <div className="p-3.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="leading-relaxed">{changelog}</p>
          </div>
        )}
      </div>

      {/* 2. Interactive Segmented Tab Bar */}
      <div className="sticky top-20 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => switchTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Overview & Guide</span>
            {hasBreakingChanges && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            )}
          </button>

          {sections.theory && (
            <button
              onClick={() => switchTab('theory')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'theory'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Domain Theory</span>
            </button>
          )}

          <button
            onClick={() => switchTab('architecture')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => switchTab('api')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'api'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>API Reference</span>
            {sections.api.endpoints && sections.api.endpoints.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'api' ? 'bg-blue-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}>
                {sections.api.endpoints.length}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab('database')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Database</span>
            {sections.database.models && sections.database.models.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'database' ? 'bg-blue-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}>
                {sections.database.models.length}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab('markdown')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === 'markdown'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Full Spec</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: OVERVIEW & DEVELOPER GUIDE */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Breaking Changes Alert (if any) */}
          {hasBreakingChanges && (
            <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Breaking Changes in this Release</span>
              </div>
              <div className="space-y-2">
                {sections.breakingChanges.map((change, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-950 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{change.affectedArea}</span>
                      <span className="uppercase text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                        {change.impact} impact
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">{change.description}</p>
                    {change.remediation && (
                      <div className="text-zinc-500 pt-1">
                        <strong>Fix:</strong> {change.remediation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCOPE A: DEVELOPER ONBOARDING & FEATURE GUIDE (When it's a feature) */}
          {(changeType === 'feature' || developerGuide) && (
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-b from-emerald-50/30 to-white dark:from-emerald-950/10 dark:to-zinc-950 p-6 space-y-5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
                <Rocket className="h-5 w-5" />
                <h2>Developer Onboarding & Feature Guide</h2>
              </div>

              {developerGuide?.summary && (
                <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                  {developerGuide.summary}
                </div>
              )}

              {developerGuide?.gettingStarted && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    How to Get Started & Use This Feature
                  </h3>
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {developerGuide.gettingStarted}
                  </div>
                </div>
              )}

              {developerGuide?.usageExample && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Code Usage Example
                    </h3>
                    <button
                      onClick={() => copyToClipboard(developerGuide.usageExample!, 'code')}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto border border-zinc-800">
                    <code>{developerGuide.usageExample}</code>
                  </pre>
                </div>
              )}

              {developerGuide?.keyFiles && developerGuide.keyFiles.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Primary Files Touched:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {developerGuide.keyFiles.map((file, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400">
                        <FileCode className="h-3 w-3 text-zinc-400" />
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCOPE B: BUG FIX & PATCH DETAILS (When it's a bug fix) */}
          {(changeType === 'fix' || patchDetails) && (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-950/10 dark:to-zinc-950 p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-base">
                <Wrench className="h-5 w-5" />
                <h2>Patch Details & Defect Resolution</h2>
              </div>

              {patchDetails?.issueDescription && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">Issue Resolved</div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">{patchDetails.issueDescription}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patchDetails?.rootCause && (
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Root Cause Analysis</div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{patchDetails.rootCause}</p>
                  </div>
                )}
                {patchDetails?.fixResolution && (
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">Fix Applied</div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{patchDetails.fixResolution}</p>
                  </div>
                )}
              </div>

              {patchDetails?.regressionNotes && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-800 dark:text-zinc-200">Regression Testing Considerations:</strong> {patchDetails.regressionNotes}
                </div>
              )}
            </div>
          )}

          {/* System Overview */}
          <div className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span>System Technical Overview</span>
            </h2>
            <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 leading-relaxed text-sm text-zinc-800 dark:text-zinc-200">
              <MarkdownRenderer content={sections.overview} />
            </div>
          </div>

          {/* Migration Notes */}
          {sections.migrationNotes && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Migration Notes:</span> {sections.migrationNotes}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOMAIN THEORY */}
      {activeTab === 'theory' && sections.theory && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-50/40 to-white dark:from-purple-950/20 dark:to-zinc-950 border border-purple-100 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-lg">
              <Sparkles className="h-5 w-5" />
              <h2>{sections.theory.title || 'Domain Theory & Technical Concepts'}</h2>
            </div>
            <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal">
              <MarkdownRenderer content={sections.theory.summary} />
            </div>
          </div>

          {/* Key Concepts Grid */}
          {sections.theory.keyConcepts && sections.theory.keyConcepts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Key Conceptual Models
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.theory.keyConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2 hover:border-purple-300 dark:hover:border-purple-800 transition"
                  >
                    <span className="font-semibold text-xs px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      {item.concept}
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1 leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structured Operational Workflow Timeline */}
          {workflowSteps.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Operational Lifecycle & Execution Flow
              </h3>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                {workflowSteps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3">
                    <span className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-sm">
                      {step.number}
                    </span>
                    <div className="flex-1 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed shadow-sm">
                      {step.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              <span>System Topology & Boundaries</span>
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {sections.architecture.summary}
            </p>

            {sections.architecture.diagram && (
              <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs overflow-x-auto text-zinc-200">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Topology Graph</div>
                <pre className="whitespace-pre">{sections.architecture.diagram}</pre>
              </div>
            )}
          </div>

          {/* Component Breakdown Cards */}
          {sections.architecture.components && sections.architecture.components.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Component Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.architecture.components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{comp.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {comp.type}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{comp.description}</p>
                    {comp.filePaths.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {comp.filePaths.map((fp, i) => (
                          <span key={i} className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
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
        </div>
      )}

      {/* TAB 4: API REFERENCE */}
      {activeTab === 'api' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter endpoints by route or description..."
                value={apiSearch}
                onChange={(e) => setApiSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Method Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    selectedMethod === method
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">{sections.api.summary}</p>

          <div className="space-y-3">
            {filteredEndpoints.length > 0 ? (
              filteredEndpoints.map((ep, idx) => {
                const isExpanded = Boolean(expandedEndpoints[idx]);
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
                    className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
                  >
                    <div
                      onClick={() => toggleEndpoint(idx)}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-850/30 cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-md border ${methodColor}`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ep.path}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ep.authentication && (
                          <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            Auth
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-3 text-xs border-t border-zinc-100 dark:border-zinc-800">
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
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 italic p-4 text-center">No API endpoints match the selected filter.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DATABASE */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{sections.database.summary}</p>
          <div className="space-y-4">
            {sections.database.models && sections.database.models.length > 0 ? (
              sections.database.models.map((model, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
                >
                  <div className="p-4 bg-zinc-50/60 dark:bg-zinc-850/40 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{model.name}</span>
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
                            <td className="py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">{f.name}</td>
                            <td className="py-2 font-mono text-blue-600 dark:text-blue-400">{f.type}</td>
                            <td className="py-2 space-x-1">
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
                                  NULL
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
              <p className="text-xs text-zinc-500 italic p-4 text-center">No database models defined.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: FULL MARKDOWN */}
      {activeTab === 'markdown' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Complete publication-grade documentation specification</span>
            <button
              onClick={() => copyToClipboard(content.fullMarkdown, 'markdown')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition"
            >
              {copiedMarkdown ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedMarkdown ? 'Copied' : 'Copy Raw Markdown'}</span>
            </button>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm leading-relaxed">
            <MarkdownRenderer content={content.fullMarkdown} />
          </div>
        </div>
      )}
    </div>
  );
}
