const { z } = require('zod');

const normalizeString = (val, fallback = '') => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n');
  }
  if (typeof val === 'object' && val !== null) {
    return val.summary || val.description || val.content || JSON.stringify(val, null, 2);
  }
  return String(val || fallback);
};

const FlexibleDocumentationContentSchema = z.object({
  title: z.any().transform((v) => normalizeString(v, 'Project Technical Documentation')),
  lastUpdated: z.any().transform((v) => (typeof v === 'string' ? v : new Date().toISOString())),
  changelog: z.any().transform((v) => normalizeString(v, 'Updated system components.')),
  sections: z.any().transform((sec) => {
    const rawSec = typeof sec === 'object' && sec !== null ? sec : {};

    // Theory normalization
    let theory = undefined;
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
          title: rawSec.theory.title || 'Domain Theory & Technical Concepts',
          summary: normalizeString(rawSec.theory.summary || rawSec.theory.content || rawSec.theory.description, ''),
          keyConcepts: Array.isArray(rawSec.theory.keyConcepts)
            ? rawSec.theory.keyConcepts.map((c) => ({
                concept: typeof c === 'string' ? c : c.concept || c.name || 'Concept',
                explanation: typeof c === 'string' ? c : c.explanation || c.description || '',
              }))
            : [],
          workflows: rawSec.theory.workflows ? normalizeString(rawSec.theory.workflows) : undefined,
        };
      }
    }

    // Architecture normalization
    let architecture = { summary: '', components: [], diagram: undefined };
    if (typeof rawSec.architecture === 'string') {
      architecture.summary = rawSec.architecture;
    } else if (typeof rawSec.architecture === 'object' && rawSec.architecture !== null) {
      architecture.summary = normalizeString(rawSec.architecture.summary, '');
      architecture.diagram = rawSec.architecture.diagram || undefined;
      architecture.components = Array.isArray(rawSec.architecture.components)
        ? rawSec.architecture.components.map((c) => ({
            name: typeof c === 'string' ? c : c.name || 'Component',
            type: typeof c === 'string' ? 'Service' : c.type || 'Service',
            description: typeof c === 'string' ? c : c.description || '',
            filePaths: Array.isArray(c.filePaths) ? c.filePaths : [],
            dependencies: Array.isArray(c.dependencies) ? c.dependencies : [],
          }))
        : [];
    }

    // API normalization
    let api = { summary: '', endpoints: [] };
    if (typeof rawSec.api === 'string') {
      api.summary = rawSec.api;
    } else if (typeof rawSec.api === 'object' && rawSec.api !== null) {
      api.summary = normalizeString(rawSec.api.summary, '');
      api.endpoints = Array.isArray(rawSec.api.endpoints)
        ? rawSec.api.endpoints.map((e) => ({
            method: (e.method || 'GET').toUpperCase(),
            path: e.path || '/api',
            description: e.description || '',
            parameters: Array.isArray(e.parameters)
              ? e.parameters.map((p) => ({
                  name: typeof p === 'string' ? p : p.name || 'param',
                  in: typeof p === 'string' ? 'query' : p.in || 'query',
                  type: typeof p === 'string' ? 'string' : p.type || 'string',
                  required: typeof p === 'string' ? false : Boolean(p.required),
                  description: typeof p === 'string' ? undefined : p.description,
                }))
              : [],
            requestBody: e.requestBody,
            responseBody: e.responseBody,
            authentication: Boolean(e.authentication),
          }))
        : [];
    }

    // Database normalization
    let database = { summary: '', models: [] };
    if (typeof rawSec.database === 'string') {
      database.summary = rawSec.database;
    } else if (typeof rawSec.database === 'object' && rawSec.database !== null) {
      database.summary = normalizeString(rawSec.database.summary, '');
      database.models = Array.isArray(rawSec.database.models)
        ? rawSec.database.models.map((m) => ({
            name: typeof m === 'string' ? m : m.name || 'Model',
            description: m.description,
            tableName: m.tableName,
            fields: Array.isArray(m.fields)
              ? m.fields.map((f) => ({
                  name: typeof f === 'string' ? f : f.name || 'field',
                  type: typeof f === 'string' ? 'String' : f.type || 'String',
                  isPrimaryKey: Boolean(f.isPrimaryKey),
                  isNullable: Boolean(f.isNullable),
                  isUnique: Boolean(f.isUnique),
                  description: f.description,
                }))
              : [],
            relations: Array.isArray(m.relations) ? m.relations : [],
          }))
        : [];
    }

    // Breaking changes normalization
    let breakingChanges = [];
    if (Array.isArray(rawSec.breakingChanges)) {
      breakingChanges = rawSec.breakingChanges.map((b) => ({
        description: typeof b === 'string' ? b : b.description || 'Breaking change',
        impact: typeof b === 'string' ? 'medium' : b.impact || 'medium',
        affectedArea: typeof b === 'string' ? 'General' : b.affectedArea || 'General',
        remediation: typeof b === 'string' ? undefined : b.remediation,
      }));
    } else if (typeof rawSec.breakingChanges === 'string' && rawSec.breakingChanges.trim()) {
      breakingChanges = [{ description: rawSec.breakingChanges, impact: 'medium', affectedArea: 'General' }];
    }

    return {
      overview: normalizeString(rawSec.overview, 'System technical overview.'),
      theory,
      architecture,
      api,
      database,
      breakingChanges,
      migrationNotes: normalizeString(rawSec.migrationNotes, 'No migration required.'),
    };
  }),
  fullMarkdown: z.any().transform((v) => normalizeString(v, '')),
});

require('dotenv').config();

async function testGeneration() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
  
  const prompt = `You are a Principal Software Architect.
Analyze the following payment service code and generate extensive, publication-grade documentation with in-depth domain theory and operational workflows.

Code:
export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'upi' | 'paypal';
  discountCoupon?: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed' | 'cancelled';
  timestamp: string;
  receiptUrl?: string;
}

export interface CancelPaymentRequest {
  orderId: string;
  transactionId: string;
  cancellationReason: string;
  notifyCustomer?: boolean;
}

export class PaymentService {
  async processPayment(req: PaymentRequest): Promise<PaymentResponse> { ... }
  async refundPayment(transactionId: string, reason: string): Promise<{ success: boolean }> { ... }
  async cancelPayment(req: CancelPaymentRequest): Promise<{ cancelled: boolean; cancellationFee: number }> { ... }
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> { ... }
}

Output JSON.`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const validated = FlexibleDocumentationContentSchema.parse(JSON.parse(text));

  console.log('\n🎉 PARSING & NORMALIZATION 100% SUCCEEDED!');
  console.log('\n================ TITLE ================');
  console.log(validated.title);
  console.log('\n================ CHANGELOG ============');
  console.log(validated.changelog);
  console.log('\n================ DOMAIN THEORY SUMMARY =');
  console.log(validated.sections.theory?.summary);
  console.log('\n================ KEY CONCEPTS =========');
  console.log(validated.sections.theory?.keyConcepts);
  console.log('\n================ WORKFLOWS ============');
  console.log(validated.sections.theory?.workflows);
}

testGeneration().catch(console.error);
