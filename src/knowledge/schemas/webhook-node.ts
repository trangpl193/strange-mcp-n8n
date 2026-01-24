/**
 * Webhook Node Schema Definition
 *
 * Validated schema for N8N Webhook-node (n8n-nodes-base.webhook) typeVersion 1.
 *
 * Webhook-node is a trigger that creates an HTTP endpoint to receive data from
 * external services. Common use case for integration with third-party webhooks.
 *
 * COMMON USE CASES:
 * - Receive GitHub webhook events
 * - Accept form submissions
 * - Integration with payment providers (Stripe, PayPal)
 * - Real-time notifications from external services
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
 */

import type { NodeSchema } from '../types.js';

/**
 * Webhook Node Complete Schema
 *
 * Documents the configuration format for webhook triggers.
 * Webhooks are HTTP endpoints that receive POST/GET requests.
 */
export const webhookNodeSchema: NodeSchema = {
  nodeType: 'webhook',
  n8nType: 'n8n-nodes-base.webhook',
  typeVersion: 1,

  formats: [
    {
      name: 'webhook',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        path: {
          type: 'string',
          required: true,
          description: 'URL path for webhook endpoint (e.g., /webhook/github)',
        },
        httpMethod: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
          default: 'POST',
          description: 'HTTP method to accept',
        },
        responseMode: {
          type: 'string',
          enum: ['onReceived', 'lastNode', 'responseNode'],
          default: 'onReceived',
          description: 'When to send HTTP response',
        },
        responseData: {
          type: 'string',
          default: 'firstEntryJson',
          description: 'What data to return in response',
        },
        responseCode: {
          type: 'number',
          default: 200,
          description: 'HTTP status code for response',
        },
        authentication: {
          type: 'string',
          enum: ['none', 'basicAuth', 'headerAuth'],
          default: 'none',
          description: 'Authentication method for webhook',
        },
      },

      example: {
        minimal: {
          path: '/webhook/test',
          httpMethod: 'POST',
          responseMode: 'onReceived',
        },

        complete: {
          path: '/webhook/github-events',
          httpMethod: 'POST',
          responseMode: 'onReceived',
          responseData: 'firstEntryJson',
          responseCode: 200,
          authentication: 'none',
        },
      },

      notes:
        'Webhook node creates an HTTP endpoint at https://{n8n-url}/webhook/{path}. ' +
        'Configure path carefully to avoid conflicts. Use authentication for production webhooks. ' +
        'responseMode="onReceived" responds immediately, "lastNode" waits for workflow completion.',

      editorRequirements: [
        {
          id: 'webhook_path',
          name: 'Webhook Path Required',
          path: 'path',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing webhook path - required to create endpoint',
          severity: 'error',
          rationale: 'Webhook path defines the URL endpoint where requests are received',
          fix: 'Add path: "/webhook/your-endpoint-name"',
        },
        {
          id: 'http_method',
          name: 'HTTP Method Required',
          path: 'httpMethod',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing httpMethod field',
          severity: 'warning',
          rationale: 'Defaults to POST if not specified, but explicit is better',
          fix: 'Add httpMethod: "POST" (or GET, PUT, DELETE, etc.)',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-24T13:00:00+07:00',
    validatedBy: 'schema_creation',
    n8nVersion: '1.76.1',
  },
};
