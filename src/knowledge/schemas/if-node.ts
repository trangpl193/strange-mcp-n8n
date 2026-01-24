/**
 * If Node Schema Definition
 *
 * Validated schema for N8N If-node (n8n-nodes-base.if) typeVersion 2.
 *
 * CRITICAL DISCOVERY (2026-01-23 UAT):
 * If-node requires HYBRID format for UI rendering:
 * - typeVersion: 2 (not 1)
 * - conditions.options wrapper (caseSensitive, leftValue, typeValidation)
 * - conditions.conditions[].id (unique ID for each condition)
 * - conditions.combinator ('and' | 'or')
 * - parameters.options: {} at root level
 *
 * Evidence:
 * - Workflow sPB8ybdrJbCVjF6M (UI-created "Test IF Branching v1.3.0"): Uses HYBRID, renders correctly
 * - Workflow IDuDIn6U7M4tUzOr (Builder-created "UAT Simple Test"): Used pure combinator, empty canvas
 *
 * Reference: /home/strange/projects/strange-mcp-n8n/src/knowledge/references/if-node/ui-created-reference.json
 */

import type { NodeSchema } from '../types.js';

/**
 * If Node Complete Schema
 *
 * Documents the HYBRID format (recommended) and pure_combinator (broken) formats.
 */
export const ifNodeSchema: NodeSchema = {
  nodeType: 'if',
  n8nType: 'n8n-nodes-base.if',
  typeVersion: 2, // CRITICAL: Must be 2, not 1

  formats: [
    {
      name: 'hybrid',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        conditions: {
          type: 'object',
          required: true,
          properties: {
            options: {
              type: 'object',
              required: true,
              description: 'REQUIRED wrapper for UI rendering',
              properties: {
                caseSensitive: {
                  type: 'boolean',
                  default: true,
                  description: 'Case-sensitive string comparison',
                },
                leftValue: {
                  type: 'string',
                  default: '',
                  description: 'Base path for left values (usually empty)',
                },
                typeValidation: {
                  type: 'string',
                  enum: ['strict', 'loose'],
                  default: 'strict',
                  description: 'Type validation mode',
                },
              },
            },
            conditions: {
              type: 'array',
              required: true,
              minItems: 1,
              description: 'Array of condition objects with unique IDs',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    required: true,
                    description: 'REQUIRED unique identifier (e.g., "condition1", uuid)',
                  },
                  leftValue: {
                    type: 'string',
                    required: true,
                    description: 'Expression to evaluate (supports ={{ $json.field }})',
                  },
                  rightValue: {
                    type: 'string',
                    required: true,
                    description: 'Value to compare against',
                  },
                  operator: {
                    type: 'object',
                    required: true,
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['string', 'number', 'boolean', 'date'],
                        required: true,
                        description: 'Data type for comparison',
                      },
                      operation: {
                        type: 'string',
                        enum: [
                          'equals',
                          'notEquals',
                          'contains',
                          'notContains',
                          'startsWith',
                          'endsWith',
                          'regex',
                          'lt',
                          'lte',
                          'gt',
                          'gte',
                        ],
                        required: true,
                        description: 'Comparison operation',
                      },
                    },
                  },
                },
              },
            },
            combinator: {
              type: 'string',
              enum: ['and', 'or'],
              required: true,
              description: 'Logical operator combining conditions',
            },
          },
        },
        options: {
          type: 'object',
          required: true,
          description: 'REQUIRED empty object at parameters root level',
          default: {},
        },
      },

      example: {
        minimal: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
            },
            conditions: [
              {
                id: 'condition1',
                leftValue: '={{ $json.status }}',
                rightValue: 'success',
                operator: {
                  type: 'string',
                  operation: 'equals',
                },
              },
            ],
            combinator: 'and',
          },
          options: {},
        },

        complete: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
            },
            conditions: [
              {
                id: 'condition1',
                leftValue: '={{ $json.price }}',
                rightValue: '200',
                operator: {
                  type: 'number',
                  operation: 'lt',
                },
              },
              {
                id: 'condition2',
                leftValue: '={{ $json.urgent }}',
                rightValue: 'true',
                operator: {
                  type: 'boolean',
                  operation: 'equals',
                },
              },
              {
                id: 'condition3',
                leftValue: '={{ $json.category }}',
                rightValue: 'premium',
                operator: {
                  type: 'string',
                  operation: 'equals',
                },
              },
            ],
            combinator: 'or',
          },
          options: {},
        },
      },

      notes:
        'This HYBRID format is the ONLY format supported by N8N UI. ' +
        'Critical requirements: (1) typeVersion=2, (2) conditions.options wrapper, ' +
        '(3) unique id field for each condition, (4) parameters.options={} at root.',

      editorRequirements: [
        {
          id: 'conditions_options_wrapper',
          name: 'Conditions Options Wrapper',
          path: 'conditions.options',
          checkType: 'exists',
          expected: { type: 'object' },
          errorMessage: 'Missing conditions.options wrapper - required for UI editor rendering',
          severity: 'error',
          rationale: 'N8N UI editor uses options wrapper to store condition settings (caseSensitive, leftValue, typeValidation)',
          fix: 'Add conditions.options: { caseSensitive: true, leftValue: "", typeValidation: "strict" }',
        },
        {
          id: 'unique_condition_ids',
          name: 'Unique Condition IDs',
          path: 'conditions.conditions[].id',
          checkType: 'custom',
          customValidator: (params: Record<string, unknown>) => {
            const conditions = (params.conditions as any)?.conditions || [];
            if (!Array.isArray(conditions)) return false;
            return conditions.every((c: any) => c.id && typeof c.id === 'string');
          },
          errorMessage: 'Each condition must have unique id field',
          severity: 'error',
          rationale: 'N8N UI uses id field to manage condition component state',
          fix: 'Add unique id to each condition: { id: "condition1", leftValue: ..., rightValue: ..., operator: ... }',
        },
        {
          id: 'root_options_field',
          name: 'Root Options Field',
          path: 'options',
          checkType: 'exists',
          expected: { type: 'object' },
          errorMessage: 'Missing root-level options field',
          severity: 'error',
          rationale: 'N8N UI expects options at parameters root level (can be empty object)',
          fix: 'Add options: {} at parameters root level',
        },
        {
          id: 'combinator_field',
          name: 'Combinator Field Required',
          path: 'conditions.combinator',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing conditions.combinator field',
          severity: 'error',
          rationale: 'Combinator defines how conditions are logically combined (and/or)',
          fix: 'Add conditions.combinator: "and" or "or"',
        },
      ],
    },

    {
      name: 'pure_combinator',
      status: 'deprecated',
      uiCompatible: false,
      apiCompatible: true,

      structure: {
        conditions: {
          type: 'object',
          properties: {
            combinator: {
              type: 'string',
              enum: ['and', 'or'],
              description: 'Logical operator (without options wrapper)',
            },
            conditions: {
              type: 'array',
              description: 'Conditions WITHOUT id field',
              items: {
                type: 'object',
                properties: {
                  leftValue: { type: 'string' },
                  rightValue: { type: 'string' },
                  operator: { type: 'object' },
                },
              },
            },
          },
        },
      },

      example: {
        minimal: {
          conditions: {
            combinator: 'and',
            conditions: [
              {
                leftValue: '={{ $json.status }}',
                rightValue: 'success',
                operator: {
                  type: 'string',
                  operation: 'equals',
                },
              },
            ],
          },
        },
        complete: {
          conditions: {
            combinator: 'and',
            conditions: [
              {
                leftValue: '={{ $json.status }}',
                rightValue: 'success',
                operator: {
                  type: 'string',
                  operation: 'equals',
                },
              },
            ],
          },
        },
      },

      notes:
        'DO NOT USE. N8N API accepts this format without error, but N8N UI ' +
        'cannot render it. Missing: options wrapper, condition IDs, root options. ' +
        'Results in empty workflow canvas.',
    },
  ],

  metadata: {
    source: 'ui_created',
    validatedDate: '2026-01-23T11:20:00+07:00',
    validatedBy: 'uat_testing_mvp',
    n8nVersion: '1.76.1',
  },
};
