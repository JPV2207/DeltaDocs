const { PrismaClient } = require('@prisma/client');
const { DocumentationContentSchema } = require('../packages/shared/dist');
require('dotenv').config();

const prisma = new PrismaClient();

async function updateDbWithGeminiTheory() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

  const systemPrompt = `You are an elite Principal Software Architect and Technical Writer at the caliber of Stripe and AWS Architecture Center.
Analyze the payment service codebase and generate publication-grade technical documentation with deep domain theory, transactional state machine lifecycles, and operational workflows.

JSON SCHEMA STRUCTURE TO EMIT:
{
  "title": "String - Payment Processing & Cancellation Lifecycle",
  "lastUpdated": "${new Date().toISOString()}",
  "changelog": "Added cancelPayment and getPaymentStatus methods with state-machine idempotency and cancellation fee calculations.",
  "sections": {
    "overview": "Overview explaining the financial transaction capabilities.",
    "theory": {
      "title": "Transactional Invariants & Cancellation Lifecycle Theory",
      "summary": "Deep architectural explanation of state transitions, idempotency, refund compensation, and risk mitigation.",
      "keyConcepts": [
        { "concept": "State Consistency & Invariants", "explanation": "Ensures terminal payment states (Succeeded, Cancelled) cannot be reverted or double-processed." },
        { "concept": "Compensating Transactions", "explanation": "Handles rollback mechanics to release authorized credit holds without customer friction." }
      ],
      "workflows": "1. Ingress request validates orderId and transactionId.\n2. Invariants are verified against database locks.\n3. Cancellation fee is computed and state transition commits.\n4. Notification events propagate asynchronously."
    },
    "architecture": {
      "summary": "Modular TypeScript domain service with clean isolation from transport and persistence layers.",
      "components": [
        { "name": "PaymentService", "type": "Service", "description": "Core business logic orchestrating payment execution, refunds, and cancellations.", "filePaths": ["mock-demo/payments.service.ts"], "dependencies": [] }
      ],
      "diagram": "graph TD\\n    Client --> Controller\\n    Controller --> PaymentService\\n    PaymentService --> Database[(PostgreSQL)]"
    },
    "api": {
      "summary": "Payment lifecycle endpoints.",
      "endpoints": [
        { "method": "POST", "path": "/payments/cancel", "description": "Cancels an in-flight payment transaction.", "parameters": [{ "name": "orderId", "in": "body", "type": "string", "required": true, "description": "Target order identifier" }], "authentication": true }
      ]
    },
    "database": {
      "summary": "Relational data structures for payment records.",
      "models": []
    },
    "breakingChanges": [],
    "migrationNotes": "Backward compatible addition. No migrations required."
  },
  "fullMarkdown": "# Payment Processing & Cancellation Lifecycle\\n\\nComplete documentation."
}`;

  const userPrompt = `Code:
export interface CancelPaymentRequest {
  orderId: string;
  transactionId: string;
  cancellationReason: string;
  notifyCustomer?: boolean;
}

export class PaymentService {
  async processPayment(req: PaymentRequest): Promise<PaymentResponse> { ... }
  async cancelPayment(req: CancelPaymentRequest): Promise<{ cancelled: boolean; cancellationFee: number }> { ... }
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> { ... }
}

Generate the comprehensive industry-standard documentation for this update now.`;

  console.log('Invoking Google Gemini 3.1 Flash Lite...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No content returned: ' + JSON.stringify(data));
  }

  const content = DocumentationContentSchema.parse(JSON.parse(text));

  // Find latest version in DB
  const latest = await prisma.documentationVersion.findFirst({
    where: { repository: 'JPV2207/DeltaDocs' },
    orderBy: { createdAt: 'desc' },
  });

  if (!latest) {
    throw new Error('No existing version found in DB');
  }

  const updated = await prisma.documentationVersion.update({
    where: { id: latest.id },
    data: {
      content: content,
      rawMarkdown: content.fullMarkdown,
      modelUsed: 'gemini-3.1-flash-lite',
      status: 'success',
    },
  });

  console.log('🎉 Successfully generated and saved Gemini theory documentation in the database!');
  console.log('ID:', updated.id);
  console.log('Commit:', updated.commitSha);
  console.log('Model:', updated.modelUsed);
  console.log('Title:', content.title);
  console.log('Theory Title:', content.sections.theory?.title);
  console.log('Theory Summary:\n', content.sections.theory?.summary);
  console.log('Key Concepts:\n', JSON.stringify(content.sections.theory?.keyConcepts, null, 2));
  console.log('Workflows:\n', content.sections.theory?.workflows);
}

updateDbWithGeminiTheory().catch(console.error).finally(() => prisma.$disconnect());
