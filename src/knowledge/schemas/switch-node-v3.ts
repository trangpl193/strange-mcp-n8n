/**
 * Switch Node Schema Definition - typeVersion 3.4
 *
 * Validated schema for N8N Switch-node (n8n-nodes-base.switch) typeVersion 3.4.
 *
 * CRITICAL: typeVersion 1 is DEPRECATED and BROKEN in modern n8n.
 * Always use typeVersion 3.4 for new workflows.
 *
 * @see docs/SWITCH_NODE_FORMATS.md for detailed format comparison
 * @see src/knowledge/schemas/switch-node.ts for legacy typeVersion 1 (deprecated)
 */

import type { NodeSchema } from '../types.js';

/**
 * Switch Node typeVersion 3.4 Schema
 *
 * typeVersion 3.4 has TWO valid modes:
 * 1. Rules mode: Condition-based routing with rules.values[]
 * 2. Expression mode: JavaScript expression routing with numberOutputs
 *
 * Key differences from typeVersion 1:
 * - Rules mode uses rules.values[] (not rules.rules[])
 * - Each condition MUST have unique id field (UUID)
 * - Expression mode uses numberOutputs (not output="multipleOutputs")
 * - Conditions have options wrapper with version: 3
 */
export const switchNodeV3Schema: NodeSchema = {
  nodeType: 'switch',
  n8nType: 'n8n-nodes-base.switch',
  typeVersion: 3.4,

  formats: [
    {
      name: 'rules-v3',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        rules: {
          type: 'object',
          description: 'Rules configuration for condition-based routing',
          properties: {
            values: {
              type: 'array',
              description: 'Array of routing rules (one per output)',
              items: {
                type: 'object',
                properties: {
                  conditions: {
                    type: 'object',
                    description: 'Condition definition with options wrapper',
                    required: ['options', 'conditions', 'combinator'],
                    properties: {
                      options: {
                        type: 'object',
                        description: 'Condition evaluation options',
                        properties: {
                          caseSensitive: {
                            type: 'boolean',
                            default: true,
                            description: 'Case-sensitive string comparison',
                          },
                          leftValue: {
                            type: 'string',
                            default: '',
                            description: 'Default left value (usually empty)',
                          },
                          typeValidation: {
                            type: 'string',
                            enum: ['strict', 'loose'],
                            default: 'strict',
                            description: 'Type coercion behavior',
                          },
                          version: {
                            type: 'number',
                            default: 3,
                            description: 'Condition format version (must be 3)',
                          },
                        },
                      },
                      conditions: {
                        type: 'array',
                        description: 'Array of individual conditions',
                        items: {
                          type: 'object',
                          required: ['id', 'leftValue', 'rightValue', 'operator'],
                          properties: {
                            id: {
                              type: 'string',
                              format: 'uuid',
                              description: 'REQUIRED: Unique UUID for this condition',
                            },
                            leftValue: {
                              type: 'string',
                              description: 'Expression to evaluate (e.g., "={{ $json.field }}")',
                            },
                            rightValue: {
                              type: 'string',
                              description: 'Value to compare against',
                            },
                            operator: {
                              type: 'object',
                              required: ['type', 'operation'],
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['string', 'number', 'boolean', 'dateTime'],
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
                                    'after',
                                    'before',
                                  ],
                                  description: 'Comparison operation',
                                },
                                name: {
                                  type: 'string',
                                  description: 'Optional display name (e.g., "filter.operator.equals")',
                                },
                              },
                            },
                          },
                        },
                      },
                      combinator: {
                        type: 'string',
                        enum: ['and', 'or'],
                        description: 'Logical operator combining conditions',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        options: {
          type: 'object',
          description: 'Root-level options (usually empty)',
          default: {},
        },
      },

      example: {
        minimal: {
          rules: {
            values: [
              {
                conditions: {
                  options: {
                    caseSensitive: true,
                    leftValue: '',
                    typeValidation: 'strict',
                    version: 3,
                  },
                  conditions: [
                    {
                      id: '08c66219-703c-4ed8-bc8f-0dfb21c2da40',
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
              },
            ],
          },
          options: {},
        },

        complete: {
          rules: {
            values: [
              {
                conditions: {
                  options: {
                    caseSensitive: true,
                    leftValue: '',
                    typeValidation: 'strict',
                    version: 3,
                  },
                  conditions: [
                    {
                      id: '08c66219-703c-4ed8-bc8f-0dfb21c2da40',
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'high',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                  combinator: 'and',
                },
              },
              {
                conditions: {
                  options: {
                    caseSensitive: true,
                    leftValue: '',
                    typeValidation: 'strict',
                    version: 3,
                  },
                  conditions: [
                    {
                      id: '563e57a9-418b-45b6-9a51-8c891156a191',
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'low',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                        name: 'filter.operator.equals',
                      },
                    },
                  ],
                  combinator: 'and',
                },
              },
            ],
          },
          options: {},
        },
      },

      notes:
        'typeVersion 3.4 rules mode uses rules.values[] (not rules.rules[]). ' +
        'Each condition MUST have unique id field (UUID format). ' +
        'Conditions are wrapped in options object with version: 3. ' +
        'Items matching rule[0] go to output 0, rule[1] to output 1, etc. ' +
        'Unmatched items route to fallbackOutput if configured.',

      editorRequirements: [
        {
          id: 'condition_id_required',
          name: 'Condition ID Required',
          path: 'rules.values[*].conditions.conditions[*].id',
          checkType: 'exists',
          expected: { type: 'string', format: 'uuid' },
          errorMessage: 'Each condition MUST have unique id field (UUID)',
          severity: 'error',
          rationale: 'n8n UI requires condition IDs for proper rendering in typeVersion 3.4',
          fix: 'Add id: uuidv4() to each condition object',
        },
        {
          id: 'options_wrapper_required',
          name: 'Options Wrapper Required',
          path: 'rules.values[*].conditions.options',
          checkType: 'exists',
          expected: { type: 'object' },
          errorMessage: 'conditions.options wrapper required for typeVersion 3.4',
          severity: 'error',
          rationale: 'typeVersion 3.4 requires options object with version: 3',
          fix: 'Add options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 }',
        },
        {
          id: 'options_version_3',
          name: 'Options Version Must Be 3',
          path: 'rules.values[*].conditions.options.version',
          checkType: 'value',
          expected: { value: 3 },
          errorMessage: 'conditions.options.version must be 3 for typeVersion 3.4',
          severity: 'error',
          rationale: 'Version mismatch causes condition evaluation errors',
          fix: 'Set options.version: 3',
        },
      ],
    },

  ],

  metadata: {
    source: 'ui_inspection',
    validatedDate: '2026-01-27T14:00:00+07:00',
    validatedBy: 'user_provided_samples',
    n8nVersion: '1.20.0+',
    notes: 'Based on working samples from workflow euW7tBP1ddy1W2Zo',
  },
};
