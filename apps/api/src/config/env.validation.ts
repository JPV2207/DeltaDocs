import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/autodocs?schema=public'),
  
  // Redis configuration
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // GitHub configuration
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_INSTALLATION_ID: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().default('autodocs-local-secret'),
  GITHUB_PAT: z.string().optional(),
  DEFAULT_REPOSITORY: z.string().default('example/repo'),
  DEFAULT_BRANCH: z.string().default('main'),

  // LLM configuration
  ANTHROPIC_API_KEY: z.string().optional(),
  PRIMARY_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5-coder:7b'),
  LLM_PROVIDER: z.enum(['anthropic', 'deepseek', 'gemini', 'google', 'ollama', 'mock']).default('anthropic'),

  // Worker & Queue settings
  QUEUE_CONCURRENCY: z.coerce.number().default(2),
  QUEUE_MAX_RETRIES: z.coerce.number().default(3),
  QUEUE_BACKOFF_DELAY_MS: z.coerce.number().default(5000),

  // Security & Throttling
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(100),
  ADMIN_API_KEY: z.string().default('autodocs-admin-secret-key'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  return parsed.data;
}
