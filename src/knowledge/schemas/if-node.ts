/**
 * If Node Schema Definition
 *
 * Validated schema for N8N If-node (n8n-nodes-base.if) typeVersion 1.
 *
 * CRITICAL DISCOVERY (2026-01-22 UAT):
 * If-node has TWO incompatible parameter formats:
 * 1. "combinator" format - UI-compatible, RECOMMENDED
 * 2. "legacy_options" format - API accepts but UI breaks
 *
 * Evidence:
 * - Workflow p0wuASUdgvHj9jxj (UI-created): Uses combinator, renders correctly
 * - Workflow gCHR2BIIyF4CLnOs (Builder-created): Used legacy format, empty canvas
 *
 * @see /home/strange/projects/strange-mcp-n8n/UAT-RESULTS-2026-01-22.md
 * @see /home/strange/projects/strange-mcp-n8n/src/schema/node-defaults/if-node.ts
 */

import type { NodeSchema } from '../types.js';

/**
 * If Node Complete Schema
 *
 * Documents both combinator (recommended) and legacy_options (deprecated) formats.
 */
export const ifNodeSchema: NodeSchema = {
  nodeType: 'if',
  n8nType: 'n8n-nodes-base.if',
  typeVersion: 1,

  formats: [
    {
      name: 'combinator',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        conditions: {
          type: 'object',
          required: true,
          properties: {
            combinator: {
              type: 'string',
              enum: ['and', 'or'],
              required: true,
              description: 'Logical operator combining conditions',
            },
            conditions: {
              type: 'array',
              required: true,
              minItems: 1,
              description: 'Array of condition objects',
              items: {
                type: 'object',
                properties: {
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
            combinator: 'or',
            conditions: [
              {
                leftValue: '={{ $json.price }}',
                rightValue: '200',
                operator: {
                  type: 'number',
                  operation: 'lt',
                },
              },
              {
                leftValue: '={{ $json.urgent }}',
                rightValue: 'true',
                operator: {
                  type: 'boolean',
                  operation: 'equals',
                },
              },
              {
                leftValue: '={{ $json.category }}',
                rightValue: 'premium',
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
        'This is the ONLY format supported by N8N UI. Always use combinator format. ' +
        'Created workflows with this format render correctly in UI and work as expected.',
    },

    {
      name: 'legacy_options',
      status: 'deprecated',
      uiCompatible: false,
      apiCompatible: true,

      structure: {
        conditions: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              description: 'Legacy options structure',
              properties: {
                caseSensitive: {
                  type: 'boolean',
                  description: 'Case-sensitive comparison',
                },
                leftValue: {
                  type: 'string',
                  description: 'Base value path',
                },
                typeValidation: {
                  type: 'string',
                  enum: ['strict', 'loose'],
                  description: 'Type validation mode',
                },
              },
            },
            string: {
              type: 'array',
              description: 'String condition array (LEGACY)',
              items: {
                type: 'object',
                properties: {
                  value1: {
                    type: 'string',
                    description: 'Left value expression',
                  },
                  value2: {
                    type: 'string',
                    description: 'Right value',
                  },
                  operation: {
                    type: 'string',
                    description: 'Comparison operation',
                  },
                },
              },
            },
            number: {
              type: 'array',
              description: 'Number condition array (LEGACY)',
            },
            boolean: {
              type: 'array',
              description: 'Boolean condition array (LEGACY)',
            },
          },
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
            string: [
              {
                value1: '={{$json.status}}',
                operation: 'equals',
                value2: 'success',
              },
            ],
          },
        },

        complete: {
          conditions: {
            options: {
              caseSensitive: false,
              leftValue: '={{ $json }}',
              typeValidation: 'loose',
            },
            string: [
              {
                value1: '={{$json.category}}',
                operation: 'equals',
                value2: 'premium',
              },
            ],
            number: [
              {
                value1: '={{$json.price}}',
                operation: 'lt',
                value2: '200',
              },
            ],
          },
        },
      },

      notes:
        'DO NOT USE. N8N API accepts this format without error, but N8N UI ' +
        'cannot render it. Results in "Could not find property option" error and ' +
        'empty workflow canvas. This format appears in older documentation but is ' +
        'not actually supported by current N8N UI code.',
    },
  ],

  metadata: {
    source: 'ui_created',
    validatedDate: '2026-01-22T14:00:00+07:00',
    validatedBy: 'uat_testing',
    n8nVersion: '1.20.0',
  },
};
