/**
 * Respond to Webhook Node Schema Definition
 *
 * Validated schema for N8N Respond-node (n8n-nodes-base.respondToWebhook) typeVersion 1.
 *
 * Respond-node sends HTTP response back to webhook caller. Must be used with
 * Webhook node (responseMode="responseNode").
 *
 * COMMON USE CASES:
 * - Return custom response to webhook caller
 * - Send success/error status to external service
 * - Return processed data after workflow execution
 * - Custom HTTP headers and status codes
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/
 */

import type { NodeSchema } from '../types.js';

/**
 * Respond Node Complete Schema
 *
 * Documents the configuration format for webhook responses.
 * Sends HTTP response with custom status, headers, and body.
 */
export const respondNodeSchema: NodeSchema = {
  nodeType: 'respond',
  n8nType: 'n8n-nodes-base.respondToWebhook',
  typeVersion: 1,

  formats: [
    {
      name: 'respond',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        respondWith: {
          type: 'string',
          enum: ['allEntries', 'firstEntry', 'noData', 'text'],
          default: 'firstEntry',
          description: 'What data to include in response',
        },
        responseCode: {
          type: 'number',
          default: 200,
          description: 'HTTP status code (200, 201, 400, 404, 500, etc.)',
        },
        responseHeaders: {
          type: 'object',
          description: 'Custom HTTP headers (optional)',
        },
        responseBody: {
          type: 'string',
          description: 'Custom response body (when respondWith="text")',
        },
      },

      example: {
        minimal: {
          respondWith: 'firstEntry',
          responseCode: 200,
        },

        complete: {
          respondWith: 'text',
          responseCode: 200,
          responseHeaders: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          },
          responseBody: '{"status": "success", "message": "Data processed"}',
        },
      },

      notes:
        'Respond node only works when Webhook node has responseMode="responseNode". ' +
        'Default responseCode is 200 (OK). Use 201 for created, 400 for bad request, ' +
        '404 for not found, 500 for server error. Set Content-Type header for JSON/XML responses.',

      editorRequirements: [
        {
          id: 'respond_with',
          name: 'Respond With Mode',
          path: 'respondWith',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing respondWith field',
          severity: 'warning',
          rationale: 'Defaults to "firstEntry" if not specified, but explicit is clearer',
          fix: 'Add respondWith: "firstEntry" (or "allEntries", "noData", "text")',
        },
        {
          id: 'response_code',
          name: 'Response Code',
          path: 'responseCode',
          checkType: 'type',
          expected: { type: 'number' },
          errorMessage: 'responseCode must be a number',
          severity: 'warning',
          rationale: 'HTTP status codes are integers (200, 404, 500, etc.)',
          fix: 'Use numeric status code: responseCode: 200',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-24T13:05:00+07:00',
    validatedBy: 'schema_creation',
    n8nVersion: '1.76.1',
  },
};
