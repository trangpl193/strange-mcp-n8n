import type { SimplifiedWorkflow } from '../../src/schemas/simplified-workflow.js';

export const SIMPLE_WEBHOOK_WORKFLOW: SimplifiedWorkflow = {
  name: 'Simple Webhook Test',
  steps: [
    { type: 'webhook', config: { path: '/test', httpMethod: 'POST' } },
    { type: 'respond', config: { statusCode: 200 } },
  ],
};

export const POSTGRES_WORKFLOW: SimplifiedWorkflow = {
  name: 'PostgreSQL Test',
  steps: [
    { type: 'manual' },
    {
      type: 'postgres',
      credential: 'test-db',
      config: { operation: 'select', table: 'users' }
    },
    { type: 'respond' },
  ],
};

export const COMPLEX_BRANCHING_WORKFLOW: SimplifiedWorkflow = {
  name: 'Complex Branching Test',
  steps: [
    { type: 'webhook', name: 'Start' },
    { type: 'if', name: 'Check', next: ['Success', 'Error'] },
    { type: 'respond', name: 'Success' },
    { type: 'respond', name: 'Error' },
  ],
};

export const ALL_NODE_TYPES_WORKFLOW: SimplifiedWorkflow = {
  name: 'All Node Types Test',
  steps: [
    { type: 'webhook' },
    { type: 'http', config: { url: 'https://api.example.com' } },
    { type: 'postgres', credential: 'db' },
    { type: 'discord', credential: 'discord' },
    { type: 'if' },
    { type: 'switch' },
    { type: 'merge' },
    { type: 'set' },
    { type: 'code', config: { code: 'return items;' } },
    { type: 'respond' },
  ],
};
