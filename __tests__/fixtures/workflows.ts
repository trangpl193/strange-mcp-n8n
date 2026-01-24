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

export const SWITCH_AUTO_CONNECT_WORKFLOW: SimplifiedWorkflow = {
  name: 'Switch Auto-Connect Test',
  steps: [
    { type: 'webhook', name: 'Trigger' },
    { type: 'code', name: 'Generate Data' },
    {
      type: 'switch',
      name: 'Priority Router',
      config: {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: {
                combinator: 'and',
                conditions: [{
                  leftValue: '={{ $json.priority }}',
                  rightValue: 'high',
                  operator: { type: 'string', operation: 'equals' }
                }]
              }
            },
            {
              conditions: {
                combinator: 'and',
                conditions: [{
                  leftValue: '={{ $json.priority }}',
                  rightValue: 'medium',
                  operator: { type: 'string', operation: 'equals' }
                }]
              }
            },
            {
              conditions: {
                combinator: 'and',
                conditions: [{
                  leftValue: '={{ $json.priority }}',
                  rightValue: 'low',
                  operator: { type: 'string', operation: 'equals' }
                }]
              }
            }
          ]
        },
        fallbackOutput: 3
      }
    },
    { type: 'code', name: 'High Priority' },
    { type: 'code', name: 'Medium Priority' },
    { type: 'code', name: 'Low Priority' },
    { type: 'respond', name: 'Response' },
  ],
};

export const IF_AUTO_CONNECT_WORKFLOW: SimplifiedWorkflow = {
  name: 'IF Auto-Connect Test',
  steps: [
    { type: 'webhook', name: 'Trigger' },
    { type: 'code', name: 'Generate Data' },
    {
      type: 'if',
      name: 'Check Urgent',
      config: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict'
          },
          conditions: [{
            id: 'urgent-check',
            leftValue: '={{ $json.urgent }}',
            rightValue: 'true',
            operator: { type: 'boolean', operation: 'equals' }
          }],
          combinator: 'and'
        },
        options: {}
      }
    },
    { type: 'code', name: 'Urgent Handler' },
    { type: 'code', name: 'Normal Handler' },
    { type: 'respond', name: 'Response' },
  ],
};
