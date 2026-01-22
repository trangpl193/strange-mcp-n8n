/**
 * Complex E2E Test Scenarios
 *
 * These fixtures represent real-world workflows with multiple steps,
 * branching logic, error handling, and database operations.
 */

import type { SimplifiedWorkflow } from '../../src/schemas/simplified-workflow.js';

/**
 * Scenario 1: Multi-Step Data Pipeline
 *
 * Webhook → HTTP Fetch → Transform → PostgreSQL Insert → Respond
 */
export const DATA_PIPELINE_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Data Pipeline',
  description: 'Webhook receives data, enriches via API, stores in PostgreSQL',
  steps: [
    {
      type: 'webhook',
      name: 'Receive Data',
      config: { path: '/api/ingest', httpMethod: 'POST' },
    },
    {
      type: 'code',
      name: 'Extract Payload',
      config: {
        code: `
          const body = $input.item.json.body;
          return { userId: body.userId, action: body.action };
        `,
      },
    },
    {
      type: 'http',
      name: 'Enrich User Data',
      config: {
        url: 'https://api.example.com/users/{{$json.userId}}',
        method: 'GET',
      },
    },
    {
      type: 'postgres',
      name: 'Store Event',
      credential: 'analytics-db',
      config: {
        operation: 'insert',
        table: 'events',
      },
    },
    {
      type: 'respond',
      name: 'Success Response',
      config: { statusCode: 201 },
    },
  ],
};

/**
 * Scenario 2: Conditional Branching with Error Handling
 *
 * Webhook → Validate → IF (Valid/Invalid) → Process/Reject → Respond
 */
export const VALIDATION_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Request Validation',
  description: 'Validates incoming requests and routes based on result',
  steps: [
    {
      type: 'webhook',
      name: 'Incoming Request',
      config: { path: '/api/submit', httpMethod: 'POST' },
    },
    {
      type: 'code',
      name: 'Validate Schema',
      config: {
        code: `
          const body = $input.item.json.body;
          const isValid = body.email && body.name;
          return { isValid, data: body };
        `,
      },
    },
    {
      type: 'if',
      name: 'Check Valid',
      config: {
        conditions: {
          boolean: [
            {
              value1: '={{$json.isValid}}',
              value2: true,
            },
          ],
        },
      },
    },
    // Valid branch
    {
      type: 'postgres',
      name: 'Store Valid Request',
      credential: 'app-db',
      config: {
        operation: 'insert',
        table: 'submissions',
      },
    },
    {
      type: 'respond',
      name: 'Success',
      config: { statusCode: 200, body: { status: 'accepted' } },
    },
    // Invalid branch
    {
      type: 'respond',
      name: 'Reject',
      config: { statusCode: 400, body: { status: 'rejected' } },
    },
  ],
};

/**
 * Scenario 3: Multi-Branch Switch Logic
 *
 * Schedule → Query DB → Switch by Status → Different Actions per Branch
 */
export const SWITCH_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Order Processing',
  description: 'Process orders differently based on status',
  steps: [
    {
      type: 'schedule',
      name: 'Every 5 Minutes',
      config: { cronExpression: '*/5 * * * *' },
    },
    {
      type: 'postgres',
      name: 'Get Pending Orders',
      credential: 'shop-db',
      config: {
        operation: 'select',
        table: 'orders',
        where: "status = 'pending'",
      },
    },
    {
      type: 'switch',
      name: 'Route by Priority',
      config: {
        rules: [
          { value: '={{$json.priority}}', output: 0, mode: 'number', value2: 1 },
          { value: '={{$json.priority}}', output: 1, mode: 'number', value2: 2 },
          { value: '={{$json.priority}}', output: 2, mode: 'number', value2: 3 },
        ],
      },
    },
    // High priority
    {
      type: 'discord',
      name: 'Alert Team',
      credential: 'discord-alerts',
      config: {
        webhookUrl: 'https://discord.com/api/webhooks/...',
        message: 'High priority order: {{$json.orderId}}',
      },
    },
    // Medium priority
    {
      type: 'http',
      name: 'Queue Processing',
      config: {
        url: 'https://queue.example.com/enqueue',
        method: 'POST',
      },
    },
    // Low priority
    {
      type: 'set',
      name: 'Mark Queued',
      config: {
        values: { status: 'queued', queuedAt: '={{$now}}' },
      },
    },
  ],
};

/**
 * Scenario 4: Parallel Processing with Merge
 *
 * Trigger → Split → Parallel Branches → Merge → Final Action
 */
export const PARALLEL_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Parallel Data Enrichment',
  description: 'Fetch data from multiple sources in parallel',
  steps: [
    {
      type: 'manual',
      name: 'Start',
    },
    {
      type: 'code',
      name: 'Prepare IDs',
      config: {
        code: `
          return [
            { id: 1, source: 'users' },
            { id: 2, source: 'products' },
            { id: 3, source: 'analytics' }
          ];
        `,
      },
    },
    // Branch 1: Users API
    {
      type: 'http',
      name: 'Fetch Users',
      config: {
        url: 'https://api.example.com/users',
        method: 'GET',
      },
    },
    // Branch 2: Products DB
    {
      type: 'postgres',
      name: 'Fetch Products',
      credential: 'shop-db',
      config: {
        operation: 'select',
        table: 'products',
      },
    },
    // Branch 3: Analytics API
    {
      type: 'http',
      name: 'Fetch Analytics',
      config: {
        url: 'https://analytics.example.com/data',
        method: 'GET',
      },
    },
    // Merge results
    {
      type: 'merge',
      name: 'Combine Data',
      config: {
        mode: 'combine',
        mergeByFields: { values: [{ field1: 'id', field2: 'id' }] },
      },
    },
    {
      type: 'code',
      name: 'Generate Report',
      config: {
        code: `
          const combined = $input.all();
          return { report: combined, timestamp: new Date() };
        `,
      },
    },
    {
      type: 'respond',
      name: 'Return Report',
      config: { statusCode: 200 },
    },
  ],
};

/**
 * Scenario 5: Error Handling and Retry Logic
 *
 * Webhook → Try HTTP → IF Failed → Retry → Fallback
 */
export const ERROR_HANDLING_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Resilient API Call',
  description: 'Handles API failures with retry and fallback',
  steps: [
    {
      type: 'webhook',
      name: 'Trigger',
      config: { path: '/api/resilient', httpMethod: 'POST' },
    },
    {
      type: 'http',
      name: 'Primary API',
      config: {
        url: 'https://primary-api.example.com/data',
        method: 'GET',
        continueOnFail: true,
      },
    },
    {
      type: 'if',
      name: 'Check Success',
      config: {
        conditions: {
          boolean: [
            {
              value1: '={{$json.error}}',
              value2: null,
            },
          ],
        },
      },
    },
    // Success path
    {
      type: 'respond',
      name: 'Success Response',
      config: { statusCode: 200 },
    },
    // Failure path - retry with fallback
    {
      type: 'http',
      name: 'Fallback API',
      config: {
        url: 'https://fallback-api.example.com/data',
        method: 'GET',
      },
    },
    {
      type: 'discord',
      name: 'Alert on Fallback',
      credential: 'discord-alerts',
      config: {
        message: '⚠️ Primary API failed, using fallback',
      },
    },
    {
      type: 'respond',
      name: 'Fallback Response',
      config: { statusCode: 200 },
    },
  ],
};

/**
 * Scenario 6: Complex Database Transaction
 *
 * Manual → Multi-step DB operations → Rollback on error
 */
export const DATABASE_TRANSACTION_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Multi-Table Update',
  description: 'Coordinated updates across multiple tables',
  steps: [
    {
      type: 'manual',
      name: 'Start Transaction',
    },
    {
      type: 'postgres',
      name: 'Update Users',
      credential: 'app-db',
      config: {
        operation: 'update',
        table: 'users',
        where: "id = {{$json.userId}}",
      },
    },
    {
      type: 'postgres',
      name: 'Insert Audit Log',
      credential: 'app-db',
      config: {
        operation: 'insert',
        table: 'audit_logs',
      },
    },
    {
      type: 'postgres',
      name: 'Update Counters',
      credential: 'app-db',
      config: {
        operation: 'executeQuery',
        query: 'UPDATE counters SET value = value + 1 WHERE key = $1',
      },
    },
    {
      type: 'code',
      name: 'Verify All Succeeded',
      config: {
        code: `
          const results = $input.all();
          const allSuccess = results.every(r => !r.json.error);
          return { success: allSuccess, results };
        `,
      },
    },
    {
      type: 'respond',
      name: 'Complete',
      config: { statusCode: 200 },
    },
  ],
};

/**
 * Scenario 7: Schedule-based Monitoring
 *
 * Schedule → Check Health → Alert on Issues
 */
export const MONITORING_WORKFLOW: SimplifiedWorkflow = {
  name: 'E2E: Health Monitor',
  description: 'Periodic health checks with alerting',
  steps: [
    {
      type: 'schedule',
      name: 'Every Minute',
      config: { cronExpression: '* * * * *' },
    },
    {
      type: 'http',
      name: 'Check API Health',
      config: {
        url: 'https://api.example.com/health',
        method: 'GET',
        continueOnFail: true,
      },
    },
    {
      type: 'postgres',
      name: 'Check DB Connection',
      credential: 'app-db',
      config: {
        operation: 'executeQuery',
        query: 'SELECT 1 as healthy',
      },
    },
    {
      type: 'code',
      name: 'Analyze Results',
      config: {
        code: `
          const apiHealth = $node['Check API Health'].json;
          const dbHealth = $node['Check DB Connection'].json;
          const isHealthy = apiHealth.status === 'ok' && dbHealth.healthy === 1;
          return { isHealthy, timestamp: new Date() };
        `,
      },
    },
    {
      type: 'if',
      name: 'Check Healthy',
      config: {
        conditions: {
          boolean: [{ value1: '={{$json.isHealthy}}', value2: true }],
        },
      },
    },
    // Unhealthy path
    {
      type: 'discord',
      name: 'Critical Alert',
      credential: 'discord-alerts',
      config: {
        message: '🚨 CRITICAL: System health check failed!',
      },
    },
    {
      type: 'postgres',
      name: 'Log Incident',
      credential: 'app-db',
      config: {
        operation: 'insert',
        table: 'incidents',
      },
    },
  ],
};

/**
 * All complex scenarios for E2E testing
 */
export const COMPLEX_SCENARIOS = {
  DATA_PIPELINE_WORKFLOW,
  VALIDATION_WORKFLOW,
  SWITCH_WORKFLOW,
  PARALLEL_WORKFLOW,
  ERROR_HANDLING_WORKFLOW,
  DATABASE_TRANSACTION_WORKFLOW,
  MONITORING_WORKFLOW,
} as const;

/**
 * Expected outcomes for each scenario
 */
export const EXPECTED_OUTCOMES = {
  DATA_PIPELINE_WORKFLOW: {
    nodes_count: 5,
    trigger_type: 'webhook',
    has_db_operation: true,
    has_http_call: true,
    ends_with_respond: true,
  },
  VALIDATION_WORKFLOW: {
    nodes_count: 6,
    trigger_type: 'webhook',
    has_branching: true,
    branch_count: 2,
  },
  SWITCH_WORKFLOW: {
    nodes_count: 7,
    trigger_type: 'schedule',
    has_switch: true,
    branch_count: 3,
  },
  PARALLEL_WORKFLOW: {
    nodes_count: 8,
    trigger_type: 'manual',
    has_merge: true,
    parallel_branches: 3,
  },
  ERROR_HANDLING_WORKFLOW: {
    nodes_count: 7,
    trigger_type: 'webhook',
    has_error_handling: true,
    has_fallback: true,
  },
  DATABASE_TRANSACTION_WORKFLOW: {
    nodes_count: 6,
    trigger_type: 'manual',
    db_operations: 3,
  },
  MONITORING_WORKFLOW: {
    nodes_count: 8,
    trigger_type: 'schedule',
    has_health_check: true,
    has_alerting: true,
  },
} as const;
