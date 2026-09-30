import { z } from 'zod';

const normalizeString = (val: unknown, fallback = ''): string => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n');
  }
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, any>;
    return obj.summary || obj.description || obj.content || obj.message || JSON.stringify(val, null, 2);
  }
  return String(val || fallback);
};

export const ApiEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  path: z.string(),
  description: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    in: z.enum(['query', 'path', 'header', 'body']),
    type: z.string(),
    required: z.boolean().default(false),
    description: z.string().optional(),
  })).default([]),
  requestBody: z.string().optional(),
  responseBody: z.string().optional(),
  authentication: z.boolean().default(false),
});

export const ArchitectureComponentSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  filePaths: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
});

export const DatabaseModelSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tableName: z.string().optional(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    isPrimaryKey: z.boolean().default(false),
    isNullable: z.boolean().default(false),
    isUnique: z.boolean().default(false),
    description: z.string().optional(),
  })).default([]),
  relations: z.array(z.string()).default([]),
});

export const BreakingChangeSchema = z.object({
  description: z.string(),
  impact: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  affectedArea: z.string(),
  remediation: z.string().optional(),
});

export const DeveloperGuideSchema = z.object({
  summary: z.string(),
  gettingStarted: z.string(),
  usageExample: z.string().optional(),
  keyFiles: z.array(z.string()).default([]),
});

export const PatchDetailsSchema = z.object({
  issueDescription: z.string(),
  rootCause: z.string(),
  fixResolution: z.string(),
  regressionNotes: z.string().optional(),
});

export const DocumentationContentSchema = z.preprocess((val: any) => {
  if (!val || typeof val !== 'object') {
    return {
      title: 'Project Documentation',
      lastUpdated: new Date().toISOString(),
      changelog: 'Initial version',
      sections: {
        changeType: 'general',
        overview: 'Overview not provided.',
        architecture: { summary: 'Architecture details not provided.', components: [] },
        api: { summary: 'API details not provided.', endpoints: [] },
        database: { summary: 'Database details not provided.', models: [] },
        breakingChanges: [],
        migrationNotes: 'No migration required.',
      },
      fullMarkdown: '# Project Documentation\n\nNo content available.',
    };
  }

  const rawSec = typeof val.sections === 'object' && val.sections !== null ? val.sections : {};

  // 0. Change Type normalization
  const validTypes = ['feature', 'fix', 'refactor', 'perf', 'docs', 'chore', 'general'];
  let changeType: 'feature' | 'fix' | 'refactor' | 'perf' | 'docs' | 'chore' | 'general' = 'general';
  if (typeof rawSec.changeType === 'string' && validTypes.includes(rawSec.changeType.toLowerCase())) {
    changeType = rawSec.changeType.toLowerCase() as any;
  } else if (typeof val.changelog === 'string') {
    const lower = val.changelog.toLowerCase();
    if (lower.startsWith('feat') || lower.includes('add') || lower.includes('new feature')) {
      changeType = 'feature';
    } else if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('patch') || lower.includes('resolve')) {
      changeType = 'fix';
    } else if (lower.startsWith('refactor')) {
      changeType = 'refactor';
    }
  }

  // Developer Guide normalization (for features)
  let developerGuide = undefined;
  if (rawSec.developerGuide && typeof rawSec.developerGuide === 'object') {
    developerGuide = {
      summary: normalizeString(rawSec.developerGuide.summary, 'Feature summary not provided.'),
      gettingStarted: normalizeString(rawSec.developerGuide.gettingStarted, 'Follow the code examples and service methods to use this capability.'),
      usageExample: rawSec.developerGuide.usageExample ? normalizeString(rawSec.developerGuide.usageExample) : undefined,
      keyFiles: Array.isArray(rawSec.developerGuide.keyFiles) ? rawSec.developerGuide.keyFiles.map(String) : [],
    };
  }

  // Patch Details normalization (for bug fixes)
  let patchDetails = undefined;
  if (rawSec.patchDetails && typeof rawSec.patchDetails === 'object') {
    patchDetails = {
      issueDescription: normalizeString(rawSec.patchDetails.issueDescription, 'Defect remediated.'),
      rootCause: normalizeString(rawSec.patchDetails.rootCause, 'Root cause identified in commit patch.'),
      fixResolution: normalizeString(rawSec.patchDetails.fixResolution, 'Resolution applied to codebase.'),
      regressionNotes: rawSec.patchDetails.regressionNotes ? normalizeString(rawSec.patchDetails.regressionNotes) : undefined,
    };
  }

  // 1. Theory normalization
  let theory: any = undefined;
  if (rawSec.theory) {
    if (typeof rawSec.theory === 'string') {
      theory = {
        title: 'Domain Theory & Technical Concepts',
        summary: rawSec.theory,
        keyConcepts: [],
        workflows: undefined,
      };
    } else if (typeof rawSec.theory === 'object') {
      theory = {
        title: String(rawSec.theory.title || 'Domain Theory & Architectural Concepts'),
        summary: normalizeString(rawSec.theory.summary || rawSec.theory.content || rawSec.theory.description, ''),
        keyConcepts: Array.isArray(rawSec.theory.keyConcepts)
          ? rawSec.theory.keyConcepts.map((c: any) => ({
              concept: typeof c === 'string' ? c : String(c.concept || c.name || 'Concept'),
              explanation: typeof c === 'string' ? c : normalizeString(c.explanation || c.description, ''),
            }))
          : [],
        workflows: rawSec.theory.workflows ? normalizeString(rawSec.theory.workflows) : undefined,
      };
    }
  }

  // 2. Architecture normalization
  let architecture: any = { summary: '', components: [], diagram: undefined };
  if (typeof rawSec.architecture === 'string') {
    architecture.summary = rawSec.architecture;
  } else if (typeof rawSec.architecture === 'object' && rawSec.architecture !== null) {
    architecture.summary = normalizeString(rawSec.architecture.summary, '');
    architecture.diagram = rawSec.architecture.diagram || undefined;
    architecture.components = Array.isArray(rawSec.architecture.components)
      ? rawSec.architecture.components.map((c: any) => ({
          name: typeof c === 'string' ? c : String(c.name || 'Component'),
          type: typeof c === 'string' ? 'Service' : String(c.type || 'Service'),
          description: typeof c === 'string' ? c : normalizeString(c.description, ''),
          filePaths: Array.isArray(c.filePaths) ? c.filePaths.map(String) : [],
          dependencies: Array.isArray(c.dependencies) ? c.dependencies.map(String) : [],
        }))
      : [];
  }

  // 3. API normalization
  let api: any = { summary: '', endpoints: [] };
  if (typeof rawSec.api === 'string') {
    api.summary = rawSec.api;
  } else if (typeof rawSec.api === 'object' && rawSec.api !== null) {
    api.summary = normalizeString(rawSec.api.summary, '');
    api.endpoints = Array.isArray(rawSec.api.endpoints)
      ? rawSec.api.endpoints.map((e: any) => {
          const method = typeof e.method === 'string' ? e.method.toUpperCase() : 'GET';
          const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
          const safeMethod = validMethods.includes(method) ? method : 'GET';
          return {
            method: safeMethod,
            path: String(e.path || '/api'),
            description: normalizeString(e.description, ''),
            parameters: Array.isArray(e.parameters)
              ? e.parameters.map((p: any) => ({
                  name: typeof p === 'string' ? p : String(p.name || 'param'),
                  in: typeof p === 'string' ? 'query' : (['query', 'path', 'header', 'body'].includes(p.in) ? p.in : 'query'),
                  type: typeof p === 'string' ? 'string' : String(p.type || 'string'),
                  required: typeof p === 'string' ? false : Boolean(p.required),
                  description: typeof p === 'string' ? undefined : (p.description ? String(p.description) : undefined),
                }))
              : [],
            requestBody: e.requestBody ? normalizeString(e.requestBody) : undefined,
            responseBody: e.responseBody ? normalizeString(e.responseBody) : undefined,
            authentication: Boolean(e.authentication),
          };
        })
      : [];
  }

  // 4. Database normalization
  let database: any = { summary: '', models: [] };
  if (typeof rawSec.database === 'string') {
    database.summary = rawSec.database;
  } else if (typeof rawSec.database === 'object' && rawSec.database !== null) {
    database.summary = normalizeString(rawSec.database.summary, '');
    database.models = Array.isArray(rawSec.database.models)
      ? rawSec.database.models.map((m: any) => ({
          name: typeof m === 'string' ? m : String(m.name || 'Model'),
          description: m.description ? String(m.description) : undefined,
          tableName: m.tableName ? String(m.tableName) : undefined,
          fields: Array.isArray(m.fields)
            ? m.fields.map((f: any) => ({
                name: typeof f === 'string' ? f : String(f.name || 'field'),
                type: typeof f === 'string' ? 'String' : String(f.type || 'String'),
                isPrimaryKey: Boolean(f.isPrimaryKey),
                isNullable: Boolean(f.isNullable),
                isUnique: Boolean(f.isUnique),
                description: f.description ? String(f.description) : undefined,
              }))
            : [],
          relations: Array.isArray(m.relations) ? m.relations.map(String) : [],
        }))
      : [];
  }

  // 5. Breaking changes normalization
  let breakingChanges: any[] = [];
  if (Array.isArray(rawSec.breakingChanges)) {
    breakingChanges = rawSec.breakingChanges.map((b: any) => ({
      description: typeof b === 'string' ? b : normalizeString(b.description, 'Breaking change'),
      impact: typeof b === 'string' ? 'medium' : (['low', 'medium', 'high', 'critical'].includes(b.impact) ? b.impact : 'medium'),
      affectedArea: typeof b === 'string' ? 'General' : String(b.affectedArea || 'General'),
      remediation: typeof b === 'string' ? undefined : (b.remediation ? normalizeString(b.remediation) : undefined),
    }));
  } else if (typeof rawSec.breakingChanges === 'string' && rawSec.breakingChanges.trim()) {
    breakingChanges = [{ description: rawSec.breakingChanges, impact: 'medium', affectedArea: 'General' }];
  }

  // 6. Full markdown normalization
  let fullMarkdown = normalizeString(val.fullMarkdown, '');
  if (!fullMarkdown.trim()) {
    const overview = normalizeString(rawSec.overview, '');
    const theorySummary = theory ? normalizeString(theory.summary) : '';
    fullMarkdown = `# ${normalizeString(val.title, 'Project Documentation')}\n\n## Overview\n${overview}\n\n${theorySummary ? `## Domain Theory\n${theorySummary}\n\n` : ''}## Architecture\n${architecture.summary}`;
  }

  return {
    title: normalizeString(val.title, 'Project Documentation'),
    lastUpdated: typeof val.lastUpdated === 'string' ? val.lastUpdated : new Date().toISOString(),
    changelog: normalizeString(val.changelog, 'Documentation updated.'),
    sections: {
      changeType,
      developerGuide,
      patchDetails,
      overview: normalizeString(rawSec.overview, 'Overview details.'),
      theory,
      architecture,
      api,
      database,
      breakingChanges,
      migrationNotes: normalizeString(rawSec.migrationNotes, 'No migration required for this update.'),
    },
    fullMarkdown,
  };
}, z.object({
  title: z.string().default('Project Documentation'),
  lastUpdated: z.string(),
  changelog: z.string(),
  sections: z.object({
    changeType: z.enum(['feature', 'fix', 'refactor', 'perf', 'docs', 'chore', 'general']).default('general'),
    developerGuide: DeveloperGuideSchema.optional(),
    patchDetails: PatchDetailsSchema.optional(),
    overview: z.string(),
    theory: z.object({
      title: z.string().default('Domain Theory & Architectural Concepts'),
      summary: z.string(),
      keyConcepts: z.array(z.object({
        concept: z.string(),
        explanation: z.string(),
      })).default([]),
      workflows: z.string().optional(),
    }).optional(),
    architecture: z.object({
      summary: z.string(),
      components: z.array(ArchitectureComponentSchema).default([]),
      diagram: z.string().optional(),
    }),
    api: z.object({
      summary: z.string(),
      endpoints: z.array(ApiEndpointSchema).default([]),
    }),
    database: z.object({
      summary: z.string(),
      models: z.array(DatabaseModelSchema).default([]),
    }),
    breakingChanges: z.array(BreakingChangeSchema).default([]),
    migrationNotes: z.string().default('No migration required for this update.'),
  }),
  fullMarkdown: z.string(),
}));

export type DocumentationContent = z.infer<typeof DocumentationContentSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type ArchitectureComponent = z.infer<typeof ArchitectureComponentSchema>;
export type DatabaseModel = z.infer<typeof DatabaseModelSchema>;
export type BreakingChange = z.infer<typeof BreakingChangeSchema>;
export type DeveloperGuide = z.infer<typeof DeveloperGuideSchema>;
export type PatchDetails = z.infer<typeof PatchDetailsSchema>;
export type DocumentationTheory = NonNullable<DocumentationContent['sections']['theory']>;
