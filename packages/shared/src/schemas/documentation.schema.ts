import { z } from 'zod';

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
  })).optional().default([]),
  requestBody: z.string().optional(),
  responseBody: z.string().optional(),
  authentication: z.boolean().optional().default(false),
});

export const ArchitectureComponentSchema = z.object({
  name: z.string(),
  type: z.string(), // e.g. "Service", "Controller", "Module", "Worker", "Middleware"
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

export const DocumentationContentSchema = z.object({
  title: z.string().default('Project Documentation'),
  lastUpdated: z.string(),
  changelog: z.string(),
  sections: z.object({
    overview: z.string(),
    architecture: z.object({
      summary: z.string(),
      components: z.array(ArchitectureComponentSchema).default([]),
      diagram: z.string().optional(), // Mermaid diagram string
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
});

export type DocumentationContent = z.infer<typeof DocumentationContentSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type ArchitectureComponent = z.infer<typeof ArchitectureComponentSchema>;
export type DatabaseModel = z.infer<typeof DatabaseModelSchema>;
export type BreakingChange = z.infer<typeof BreakingChangeSchema>;
