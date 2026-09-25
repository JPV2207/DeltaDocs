/**
 * AutoDocs - Seed Initial Mock Documentation
 * 
 * Populates PostgreSQL with realistic baseline and incremental documentation
 * snapshots so developers can immediately explore the Next.js UI.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock documentation versions...');

  const repository = process.env.DEFAULT_REPOSITORY || 'example/autodocs-sample';
  const branch = 'main';

  // 1. Baseline Full Generation
  const v1Sha = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';
  await prisma.documentationVersion.upsert({
    where: {
      repository_commitSha: {
        repository,
        commitSha: v1Sha,
      },
    },
    update: {},
    create: {
      repository,
      commitSha: v1Sha,
      shortSha: v1Sha.substring(0, 7),
      commitMessage: 'feat: initial project setup with NestJS and Prisma ORM',
      commitAuthor: 'Alex Chen',
      commitDate: new Date(Date.now() - 86400000 * 3),
      branch,
      generationType: 'full',
      status: 'success',
      modelUsed: 'claude-3-5-sonnet-20241022',
      changedFiles: ['src/main.ts', 'src/app.module.ts', 'prisma/schema.prisma', 'package.json'],
      generationTimeMs: 4200,
      tokenUsage: { promptTokens: 3200, completionTokens: 1150, totalTokens: 4350 },
      rawMarkdown: `# AutoDocs Sample Project\n\nInitial architecture baseline.`,
      content: {
        title: 'AutoDocs Sample Service Documentation',
        lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString(),
        changelog: 'Initial baseline documentation generated from repository scan.',
        sections: {
          overview: 'This service provides core business logic, user management, and transactional processing. It is engineered with NestJS and PostgreSQL.',
          architecture: {
            summary: 'Modular layered architecture containing Web controllers, Domain services, and a Prisma persistence layer.',
            components: [
              {
                name: 'UsersModule',
                type: 'Module',
                description: 'Handles user lifecycle, authentication records, and profiles.',
                filePaths: ['src/users/users.module.ts', 'src/users/users.service.ts'],
                dependencies: ['PrismaService'],
              },
              {
                name: 'AuthModule',
                type: 'Module',
                description: 'JWT issuance and token verification.',
                filePaths: ['src/auth/auth.module.ts'],
                dependencies: ['UsersService'],
              },
            ],
            diagram: 'graph TD\n    Client[Web Client] --> Gateway[API Gateway]\n    Gateway --> Users[Users Module]\n    Gateway --> Auth[Auth Module]\n    Users --> DB[(PostgreSQL)]',
          },
          api: {
            summary: 'REST endpoints for users and authentication.',
            endpoints: [
              {
                method: 'GET',
                path: '/api/users',
                description: 'Retrieve paginated list of active users.',
                parameters: [
                  { name: 'page', in: 'query', type: 'number', required: false, description: 'Page index' },
                  { name: 'limit', in: 'query', type: 'number', required: false, description: 'Items per page' },
                ],
                authentication: true,
              },
              {
                method: 'POST',
                path: '/api/auth/login',
                description: 'Authenticate user credentials and return bearer JWT.',
                parameters: [],
                authentication: false,
              },
            ],
          },
          database: {
            summary: 'Relational data models managed with Prisma ORM.',
            models: [
              {
                name: 'User',
                tableName: 'users',
                description: 'User accounts and security credentials.',
                fields: [
                  { name: 'id', type: 'String', isPrimaryKey: true, isNullable: false, isUnique: true },
                  { name: 'email', type: 'String', isPrimaryKey: false, isNullable: false, isUnique: true },
                  { name: 'name', type: 'String', isPrimaryKey: false, isNullable: true, isUnique: false },
                  { name: 'createdAt', type: 'DateTime', isPrimaryKey: false, isNullable: false, isUnique: false },
                ],
                relations: ['Session[]'],
              },
            ],
          },
          breakingChanges: [],
          migrationNotes: 'Baseline generation. No migrations required.',
        },
        fullMarkdown: '# AutoDocs Sample Service Documentation\n\nFull baseline documentation.',
      },
    },
  });

  // 2. Incremental Update
  const v2Sha = '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e';
  await prisma.documentationVersion.upsert({
    where: {
      repository_commitSha: {
        repository,
        commitSha: v2Sha,
      },
    },
    update: {},
    create: {
      repository,
      commitSha: v2Sha,
      shortSha: v2Sha.substring(0, 7),
      commitMessage: 'feat(api): add webhooks ingress endpoint and rate limiting',
      commitAuthor: 'Sarah Jenkins',
      commitDate: new Date(),
      branch,
      generationType: 'incremental',
      status: 'success',
      modelUsed: 'claude-3-5-sonnet-20241022',
      changedFiles: ['src/webhooks/webhook.controller.ts', 'src/webhooks/webhook.service.ts'],
      generationTimeMs: 2950,
      tokenUsage: { promptTokens: 2100, completionTokens: 850, totalTokens: 2950 },
      rawMarkdown: `# AutoDocs Sample Project\n\nUpdated with Webhooks ingress API.`,
      content: {
        title: 'AutoDocs Sample Service Documentation',
        lastUpdated: new Date().toISOString(),
        changelog: 'Added Webhooks module with HMAC signature verification and rate limiting support.',
        sections: {
          overview: 'This service provides core business logic, user management, and transactional processing. Recently expanded with automated webhook ingestion.',
          architecture: {
            summary: 'Modular layered architecture containing Web controllers, Domain services, and a Prisma persistence layer.',
            components: [
              {
                name: 'UsersModule',
                type: 'Module',
                description: 'Handles user lifecycle, authentication records, and profiles.',
                filePaths: ['src/users/users.module.ts', 'src/users/users.service.ts'],
                dependencies: ['PrismaService'],
              },
              {
                name: 'WebhookModule',
                type: 'Module',
                description: 'Verifies incoming HMAC-SHA256 webhooks and enqueues event payloads.',
                filePaths: ['src/webhooks/webhook.module.ts', 'src/webhooks/webhook.controller.ts'],
                dependencies: ['QueueModule'],
              },
            ],
            diagram: 'graph TD\n    GitHub[GitHub Webhook] --> WebhookModule[Webhook Controller]\n    WebhookModule --> Queue[(BullMQ Redis)]\n    Users --> DB[(PostgreSQL)]',
          },
          api: {
            summary: 'REST endpoints for users, authentication, and webhook ingress.',
            endpoints: [
              {
                method: 'POST',
                path: '/webhooks/github',
                description: 'Ingress webhook verifying X-Hub-Signature-256 for GitHub events.',
                parameters: [],
                authentication: true,
              },
              {
                method: 'GET',
                path: '/api/users',
                description: 'Retrieve paginated list of active users.',
                parameters: [],
                authentication: true,
              },
            ],
          },
          database: {
            summary: 'Relational data models managed with Prisma ORM.',
            models: [
              {
                name: 'User',
                tableName: 'users',
                description: 'User accounts and security credentials.',
                fields: [
                  { name: 'id', type: 'String', isPrimaryKey: true, isNullable: false, isUnique: true },
                  { name: 'email', type: 'String', isPrimaryKey: false, isNullable: false, isUnique: true },
                ],
                relations: [],
              },
            ],
          },
          breakingChanges: [],
          migrationNotes: 'No database migration required for webhook endpoints.',
        },
        fullMarkdown: '# AutoDocs Sample Service Documentation\n\nUpdated with Webhook ingestion.',
      },
    },
  });

  console.log('✅ Seeding completed! 2 documentation versions added.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
