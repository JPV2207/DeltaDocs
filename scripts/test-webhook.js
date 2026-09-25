/**
 * AutoDocs - Webhook Test Simulation Script
 * 
 * Simulates a GitHub push webhook with a valid HMAC-SHA256 signature.
 * Usage:
 *   node scripts/test-webhook.js [commitSha] [repository]
 */

const crypto = require('crypto');
const http = require('http');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'autodocs-local-secret';
const PORT = process.env.PORT || 3001;
const REPO = process.argv[3] || process.env.DEFAULT_REPOSITORY || 'example/sample-repo';
const COMMIT_SHA = process.argv[2] || crypto.randomBytes(20).toString('hex');
const SHORT_SHA = COMMIT_SHA.substring(0, 7);

const payload = JSON.stringify({
  ref: 'refs/heads/main',
  before: '0000000000000000000000000000000000000000',
  after: COMMIT_SHA,
  repository: {
    name: REPO.split('/')[1] || REPO,
    full_name: REPO,
    owner: {
      name: REPO.split('/')[0] || 'owner',
    },
  },
  pusher: {
    name: 'octocat',
    email: 'octocat@github.com',
  },
  head_commit: {
    id: COMMIT_SHA,
    message: 'feat: add user authentication & jwt tokens',
    timestamp: new Date().toISOString(),
    author: {
      name: 'Mona Lisa Octocat',
      email: 'octocat@github.com',
    },
    added: ['src/auth/auth.service.ts', 'src/auth/auth.controller.ts'],
    modified: ['src/app.module.ts', 'package.json'],
    removed: [],
  },
  commits: [
    {
      id: COMMIT_SHA,
      message: 'feat: add user authentication & jwt tokens',
      timestamp: new Date().toISOString(),
      author: {
        name: 'Mona Lisa Octocat',
        email: 'octocat@github.com',
      },
      added: ['src/auth/auth.service.ts', 'src/auth/auth.controller.ts'],
      modified: ['src/app.module.ts', 'package.json'],
      removed: [],
    },
  ],
});

// Compute HMAC-SHA256 signature
const hmac = crypto.createHmac('sha256', SECRET);
const signature = 'sha256=' + hmac.update(payload).digest('hex');

console.log('Sending simulated GitHub push webhook...');
console.log(`Repository: ${REPO}`);
console.log(`Commit:     ${SHORT_SHA} (${COMMIT_SHA})`);
console.log(`Signature:  ${signature.substring(0, 20)}...`);

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/webhooks/github',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-github-event': 'push',
    'x-hub-signature-256': signature,
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`\nResponse Code: ${res.statusCode} ${res.statusMessage}`);
    try {
      console.log('Response Body:', JSON.stringify(JSON.parse(data), null, 2));
    } catch {
      console.log('Response Body:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\nRequest failed: ${e.message}`);
  console.log('Ensure the NestJS API server is running on port ' + PORT);
});

req.write(payload);
req.end();
