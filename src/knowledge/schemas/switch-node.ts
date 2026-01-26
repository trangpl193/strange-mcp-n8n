/**
 * Switch Node Schema Definition
 *
 * Validated schema for N8N Switch-node (n8n-nodes-base.switch) typeVersion 1.
 *
 * Switch-node allows routing workflow execution based on multiple conditions,
 * similar to If-node but supports more than 2 output branches.
 *
 * SIMILARITY TO IF-NODE:
 * Switch-node likely uses similar condition format as If-node (combinator pattern).
 * Both are conditional logic nodes with similar parameter structures.
 *
 * @see src/knowledge/schemas/if-node.ts for similar conditional node pattern
 */

import type { NodeSchema } from '../types.js';

/**
 * Switch Node Complete Schema
 *
 * Documents the expected format for Switch-node conditions.
 * Based on N8N conditional node patterns (similar to If-node).
 */
export const switchNodeSchema: NodeSchema = {
  nodeType: 'switch',
  n8nType: 'n8n-nodes-base.switch',
  typeVersion: 1,

  formats: [
    {
      name: 'rules',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          enum: ['rules', 'expression'],
          default: 'rules',
          description: 'Switch mode: rules-based or expression-based routing',
        },
        rules: {
          type: 'object',
          description: 'Rules configuration for switch routing',
          properties: {
            values: {
              type: 'array',
              description: 'Array of routing rules',
              items: {
                type: 'object',
                properties: {
                  conditions: {
                    type: 'object',
                    description: 'Condition definition (similar to If-node)',
                    properties: {
                      combinator: {
                        type: 'string',
                        enum: ['and', 'or'],
                        description: 'Logical operator for combining conditions',
                      },
                      conditions: {
                        type: 'array',
                        description: 'Array of individual conditions',
                        items: {
                          type: 'object',
                          properties: {
                            leftValue: {
                              type: 'string',
                              description: 'Expression to evaluate',
                            },
                            rightValue: {
                              type: 'string',
                              description: 'Value to compare against',
                            },
                            operator: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['string', 'number', 'boolean', 'date'],
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
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        fallbackOutput: {
          type: 'number',
          description: 'Output index for items that match no rules',
          default: 3,
        },
      },

      example: {
        minimal: {
          mode: 'rules',
          rules: {
            values: [
              {
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
            ],
          },
          fallbackOutput: 3,
        },

        complete: {
          mode: 'rules',
          rules: {
            values: [
              {
                // Rule 1: High priority
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'high',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
              {
                // Rule 2: Medium priority
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'medium',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
              {
                // Rule 3: Low priority
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'low',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
            ],
          },
          fallbackOutput: 3,
        },
      },

      notes:
        'Switch-node uses rules-based routing with multiple output branches. ' +
        'Each rule has conditions similar to If-node combinator format. ' +
        'Items matching rule 1 go to output 0, rule 2 to output 1, etc. ' +
        'Items matching no rules go to fallbackOutput.',

      editorRequirements: [
        {
          id: 'rules_values_array',
          name: 'Rules Values Array',
          path: 'rules.values',
          checkType: 'exists',
          expected: { type: 'array', minLength: 1 },
          errorMessage: 'Missing rules.values array - required for rules mode',
          severity: 'error',
          rationale: 'Switch rules mode requires rules.values array structure (not direct rules array)',
          fix: 'Use rules: { values: [...] } instead of rules: [...]',
        },
        {
          id: 'rules_mode_set',
          name: 'Rules Mode Set',
          path: 'mode',
          checkType: 'value',
          expected: { value: 'rules' },
          errorMessage: 'mode must be set to "rules" for rules-based routing',
          severity: 'error',
          rationale: 'Switch node requires explicit mode declaration to differentiate between rules and expression modes',
          fix: 'Add mode: "rules" to parameters',
        },
        {
          id: 'fallback_output',
          name: 'Fallback Output Configured',
          path: 'fallbackOutput',
          checkType: 'exists',
          expected: { type: 'number' },
          errorMessage: 'Missing fallbackOutput configuration',
          severity: 'warning',
          rationale: 'Items matching no rules need fallback routing to avoid dropped data',
          fix: 'Add fallbackOutput: <output_index> (usually rules.values.length for last output)',
        },
      ],
    },

    {
      name: 'expression-simple',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          value: 'expression',
          description: 'Expression-based routing mode with simple output expression',
        },
        output: {
          type: 'string',
          description: 'Expression that returns output index (0, 1, 2, ...)',
        },
      },

      example: {
        minimal: {
          mode: 'expression',
          output: '={{ $json.outputIndex }}',
        },

        complete: {
          mode: 'expression',
          output:
            '={{ $json.priority === "high" ? 0 : $json.priority === "medium" ? 1 : 2 }}',
        },
      },

      notes:
        'Expression mode with simple string allows dynamic routing based on JavaScript expression. ' +
        'Expression must return integer (0-based output index). ' +
        'More flexible than rules mode but requires JavaScript knowledge. ' +
        'For multiple named outputs with conditions, use expression-multipleOutputs format instead.',
    },

    {
      name: 'expression-multipleOutputs',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          value: 'expression',
          description: 'Expression-based routing mode with multiple named outputs',
        },
        output: {
          type: 'string',
          value: 'multipleOutputs',
          description: 'Fixed value indicating multiple output branches with names',
        },
        rules: {
          type: 'object',
          description: 'Rules configuration with named outputs',
          properties: {
            rules: {
              type: 'array',
              description: 'Array of routing rules with output keys',
              items: {
                type: 'object',
                properties: {
                  outputKey: {
                    type: 'string',
                    description: 'Named identifier for this output branch',
                  },
                  conditions: {
                    type: 'object',
                    description: 'Condition definition (If-node format)',
                    properties: {
                      combinator: {
                        type: 'string',
                        enum: ['and', 'or'],
                        description: 'Logical operator for combining conditions',
                      },
                      conditions: {
                        type: 'array',
                        description: 'Array of individual conditions',
                        items: {
                          type: 'object',
                          properties: {
                            leftValue: {
                              type: 'string',
                              description: 'Expression to evaluate',
                            },
                            rightValue: {
                              type: 'string',
                              description: 'Value to compare against',
                            },
                            operator: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['string', 'number', 'boolean', 'date'],
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
                                },
                              },
                            },
                          },
                        },
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
          mode: 'expression',
          output: 'multipleOutputs',
          rules: {
            rules: [
              {
                outputKey: 'high_priority',
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'high',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        complete: {
          mode: 'expression',
          output: 'multipleOutputs',
          rules: {
            rules: [
              {
                outputKey: 'high_priority',
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'high',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
              {
                outputKey: 'medium_priority',
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'medium',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
              {
                outputKey: 'low_priority',
                conditions: {
                  combinator: 'or',
                  conditions: [
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'low',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                    {
                      leftValue: '={{ $json.priority }}',
                      rightValue: 'normal',
                      operator: {
                        type: 'string',
                        operation: 'equals',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },

      notes:
        'Expression mode with multipleOutputs (RECOMMENDED for builder usage). ' +
        'Uses mode: "expression", output: "multipleOutputs", and rules.rules array (not rules.values!). ' +
        'Each rule has outputKey for naming the branch and conditions in If-node format. ' +
        'This format is UI-compatible and validated by N8N editor. ' +
        'UAT workflows use this format successfully. ' +
        'Items matching rule[0] go to output 0, rule[1] to output 1, etc.',

      editorRequirements: [
        {
          id: 'expression_multipleOutputs_mode',
          name: 'Expression Mode Required',
          path: 'mode',
          checkType: 'value',
          expected: { value: 'expression' },
          errorMessage: 'mode must be "expression" for multipleOutputs format',
          severity: 'error',
          rationale: 'multipleOutputs only works with expression mode, not rules mode',
          fix: 'Set mode: "expression"',
        },
        {
          id: 'multipleOutputs_literal',
          name: 'Output Must Be "multipleOutputs"',
          path: 'output',
          checkType: 'value',
          expected: { value: 'multipleOutputs' },
          errorMessage: 'output must be literal string "multipleOutputs"',
          severity: 'error',
          rationale: 'N8N UI expects exact string "multipleOutputs" to enable named output branches',
          fix: 'Set output: "multipleOutputs" (not an expression)',
        },
        {
          id: 'rules_rules_array',
          name: 'Rules.rules Array Required',
          path: 'rules.rules',
          checkType: 'exists',
          expected: { type: 'array', minLength: 1 },
          errorMessage: 'Missing rules.rules array - note: rules.rules not rules.values!',
          severity: 'error',
          rationale: 'multipleOutputs format uses rules.rules array (different from rules mode which uses rules.values)',
          fix: 'Use rules: { rules: [...] } not rules: { values: [...] }',
        },
        {
          id: 'outputKey_required',
          name: 'OutputKey Required For Each Rule',
          path: 'rules.rules[*].outputKey',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Each rule must have outputKey for named branch',
          severity: 'error',
          rationale: 'Named outputs require outputKey to identify branch in UI',
          fix: 'Add outputKey: "branch_name" to each rule',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-22T20:30:00+07:00',
    validatedBy: 'schema_inference',
    n8nVersion: '1.20.0',
  },
};
