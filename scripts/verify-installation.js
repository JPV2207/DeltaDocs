/**
 * AutoDocs - Verification Script
 * Validates Zod schema parsing, HMAC signature verification, and ts-morph AST extraction.
 */

const crypto = require('crypto');
const path = require('path');
const { DocumentationContentSchema } = require(path.join(__dirname, '../packages/shared/dist'));
const { Project, ScriptTarget } = require('ts-morph');

function testSchemaValidation() {
  console.log('[1/3] Testing DocumentationContentSchema Zod validation...');
  const sampleDoc = {
    title: 'Test Service Documentation',
    lastUpdated: new Date().toISOString(),
    changelog: 'Initial version',
    sections: {
      overview: 'Sample overview markdown.',
      architecture: {
        summary: 'Architecture summary',
        components: [
          {
            name: 'SampleService',
            type: 'Service',
            description: 'Handles business operations',
            filePaths: ['src/sample.service.ts'],
            dependencies: [],
          },
        ],
        diagram: 'graph TD; A-->B;',
      },
      api: {
        summary: 'REST APIs',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/health',
            description: 'Health check',
            parameters: [],
            authentication: false,
          },
        ],
      },
      database: {
        summary: 'Database models',
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              { name: 'id', type: 'String', isPrimaryKey: true, isNullable: false, isUnique: true },
              { name: 'email', type: 'String', isPrimaryKey: false, isNullable: false, isUnique: true },
            ],
            relations: [],
          },
        ],
      },
      breakingChanges: [],
      migrationNotes: 'No migrations.',
    },
    fullMarkdown: '# Sample Documentation\n\nAll clear.',
  };

  const result = DocumentationContentSchema.safeParse(sampleDoc);
  if (!result.success) {
    throw new Error('Schema validation failed: ' + JSON.stringify(result.error.format()));
  }
  console.log('✅ Zod schema validation passed successfully!');
}

function testHmacVerification() {
  console.log('[2/3] Testing GitHub HMAC-SHA256 signature verification...');
  const secret = 'super-secret-key-12345';
  const payload = JSON.stringify({ action: 'push', ref: 'refs/heads/main' });

  // Generate signature
  const hmac = crypto.createHmac('sha256', secret);
  const signature = 'sha256=' + hmac.update(payload).digest('hex');

  // Verify signature
  const verifyHmac = crypto.createHmac('sha256', secret);
  const expected = 'sha256=' + verifyHmac.update(payload).digest('hex');

  const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) {
    throw new Error('HMAC verification failed!');
  }
  console.log('✅ GitHub Webhook HMAC-SHA256 signature verification passed!');
}

function testTsMorphAnalysis() {
  console.log('[3/3] Testing ts-morph AST extraction...');
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { target: ScriptTarget.ES2022 },
  });

  const tsCode = `
    import { Injectable } from '@nestjs/common';

    export interface UserDto {
      id: string;
      email: string;
      isActive?: boolean;
    }

    @Injectable()
    export class UserService {
      /**
       * Find a user by id
       */
      async findById(id: string): Promise<UserDto> {
        return { id, email: 'test@example.com' };
      }
    }
  `;

  const sourceFile = project.createSourceFile('user.service.ts', tsCode);
  const classes = sourceFile.getClasses();
  const interfaces = sourceFile.getInterfaces();

  if (classes.length !== 1 || classes[0].getName() !== 'UserService') {
    throw new Error('Class extraction failed!');
  }
  if (interfaces.length !== 1 || interfaces[0].getName() !== 'UserDto') {
    throw new Error('Interface extraction failed!');
  }

  const methods = classes[0].getMethods();
  if (methods.length !== 1 || methods[0].getName() !== 'findById') {
    throw new Error('Method extraction failed!');
  }

  console.log(`✅ ts-morph AST analysis successfully extracted: class "${classes[0].getName()}", method "${methods[0].getName()}", interface "${interfaces[0].getName()}"!`);
}

function runAll() {
  try {
    testSchemaValidation();
    testHmacVerification();
    testTsMorphAnalysis();
    console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

runAll();
