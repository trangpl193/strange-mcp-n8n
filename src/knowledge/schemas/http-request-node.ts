/**
 * HTTP Request Node Schema Definition
 *
 * Validated schema for N8N HTTP-Request-node (n8n-nodes-base.httpRequest) typeVersion 4.
 *
 * HTTP Request node makes HTTP/HTTPS requests to external APIs and services.
 * Supports all HTTP methods, authentication, headers, query parameters, and body.
 *
 * COMMON USE CASES:
 * - Call REST APIs
 * - Fetch data from external services
 * - Send data to third-party APIs
 * - Integration with any HTTP-based service
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
 */

import type { NodeSchema } from '../types.js';

/**
 * HTTP Request Node Complete Schema
 *
 * Documents the configuration format for HTTP requests.
 * Covers common parameters for API integration.
 */
export const httpRequestNodeSchema: NodeSchema = {
  nodeType: 'http',
  n8nType: 'n8n-nodes-base.httpRequest',
  typeVersion: 4,

  formats: [
    {
      name: 'http_request',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        url: {
          type: 'string',
          required: true,
          description: 'Full URL or path to request',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          default: 'GET',
          description: 'HTTP method',
        },
        authentication: {
          type: 'string',
          enum: [
            'none',
            'genericCredentialType',
            'predefinedCredentialType',
          ],
          default: 'none',
          description: 'Authentication method',
        },
        sendHeaders: {
          type: 'boolean',
          default: false,
          description: 'Whether to send custom headers',
        },
        headerParameters: {
          type: 'object',
          description: 'Custom HTTP headers',
          properties: {
            parameters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
        },
        sendQuery: {
          type: 'boolean',
          default: false,
          description: 'Whether to send query parameters',
        },
        queryParameters: {
          type: 'object',
          description: 'URL query parameters',
        },
        sendBody: {
          type: 'boolean',
          default: false,
          description: 'Whether to send request body',
        },
        bodyParameters: {
          type: 'object',
          description: 'Request body (for POST/PUT/PATCH)',
        },
        options: {
          type: 'object',
          description: 'Additional request options (timeout, redirect, etc.)',
        },
      },

      example: {
        minimal: {
          url: 'https://api.example.com/users',
          method: 'GET',
          authentication: 'none',
        },

        complete: {
          url: 'https://api.example.com/users',
          method: 'POST',
          authentication: 'genericCredentialType',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: 'Content-Type', value: 'application/json' },
              { name: 'X-API-Key', value: '={{ $credentials.apiKey }}' },
            ],
          },
          sendQuery: true,
          queryParameters: {
            parameters: [
              { name: 'page', value: '1' },
              { name: 'limit', value: '10' },
            ],
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'name', value: '={{ $json.name }}' },
              { name: 'email', value: '={{ $json.email }}' },
            ],
          },
          options: {
            timeout: 10000,
            redirect: {
              follow: true,
              maxRedirects: 5,
            },
          },
        },
      },

      notes:
        'HTTP Request is the most flexible integration node. Use expressions (={{ ... }}) ' +
        'to access data from previous nodes. Set appropriate headers (Content-Type) for JSON/XML. ' +
        'Consider timeouts for slow APIs. Use authentication for secure endpoints.',

      editorRequirements: [
        {
          id: 'url_required',
          name: 'URL Required',
          path: 'url',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing url field - required to make HTTP request',
          severity: 'error',
          rationale: 'URL defines the endpoint to request',
          fix: 'Add url: "https://api.example.com/endpoint"',
        },
        {
          id: 'method_required',
          name: 'HTTP Method Required',
          path: 'method',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing method field',
          severity: 'warning',
          rationale: 'Defaults to GET if not specified, but explicit is clearer',
          fix: 'Add method: "GET" (or POST, PUT, DELETE, etc.)',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-24T13:10:00+07:00',
    validatedBy: 'schema_creation',
    n8nVersion: '1.76.1',
  },
};
