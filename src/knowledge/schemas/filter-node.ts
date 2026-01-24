/**
 * Filter Node Schema Definition
 *
 * Validated schema for N8N Filter-node (n8n-nodes-base.filter) typeVersion 2.
 *
 * Filter-node removes items from workflow that don't match specified conditions.
 * Unlike If/Switch which route to different branches, Filter keeps/removes items
 * from the current branch.
 *
 * COMMON USE CASES:
 * - Remove null/empty items from data array
 * - Keep only items matching specific criteria
 * - Data quality filtering before processing
 *
 * @see src/knowledge/schemas/if-node.ts for similar condition pattern
 */

import type { NodeSchema } from '../types.js';

/**
 * Filter Node Complete Schema
 *
 * Documents the condition format for filtering items.
 * Uses similar combinator pattern as If-node and Switch-node.
 */
export const filterNodeSchema: NodeSchema = {
  nodeType: 'filter',
  n8nType: 'n8n-nodes-base.filter',
  typeVersion: 2,

  formats: [
    {
      name: 'conditions',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        conditions: {
          type: 'object',
          required: true,
          description: 'Conditions to filter items',
          properties: {
            combinator: {
              type: 'string',
              enum: ['and', 'or'],
              required: true,
              description: 'Logical operator for combining conditions',
            },
            conditions: {
              type: 'array',
              required: true,
              minItems: 1,
              description: 'Array of filter conditions',
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
                        enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
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
                          'exists',
                          'notExists',
                          'empty',
                          'notEmpty',
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
                rightValue: 'active',
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
                // Filter: status must be active
                leftValue: '={{ $json.status }}',
                rightValue: 'active',
                operator: {
                  type: 'string',
                  operation: 'equals',
                },
              },
              {
                // Filter: price must be greater than 100
                leftValue: '={{ $json.price }}',
                rightValue: '100',
                operator: {
                  type: 'number',
                  operation: 'gt',
                },
              },
              {
                // Filter: email must not be empty
                leftValue: '={{ $json.email }}',
                rightValue: '',
                operator: {
                  type: 'string',
                  operation: 'notEmpty',
                },
              },
            ],
          },
        },
      },

      notes:
        'Filter-node uses the same combinator + conditions format as If-node. ' +
        'Items matching the conditions are KEPT and passed to next node. ' +
        'Items not matching are REMOVED from the workflow. ' +
        'Use "and" combinator when all conditions must match, "or" when any condition matches.',

      editorRequirements: [
        {
          id: 'combinator_field',
          name: 'Combinator Field Required',
          path: 'conditions.combinator',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing conditions.combinator field',
          severity: 'error',
          rationale: 'Combinator defines how filter conditions are logically combined (and/or)',
          fix: 'Add conditions.combinator: "and" or "or"',
        },
        {
          id: 'conditions_array',
          name: 'Conditions Array Required',
          path: 'conditions.conditions',
          checkType: 'type',
          expected: { type: 'array', minLength: 1 },
          errorMessage: 'Missing or empty conditions.conditions array',
          severity: 'error',
          rationale: 'Filter node requires at least one condition to filter items',
          fix: 'Add conditions.conditions: [{ leftValue: ..., rightValue: ..., operator: ... }]',
        },
        {
          id: 'condition_structure',
          name: 'Condition Structure Valid',
          path: 'conditions.conditions[]',
          checkType: 'custom',
          customValidator: (params: any) => {
            const conditions = params?.conditions?.conditions || [];
            return conditions.every((c: any) =>
              c.leftValue !== undefined &&
              c.rightValue !== undefined &&
              c.operator?.type &&
              c.operator?.operation
            );
          },
          errorMessage: 'Each condition must have leftValue, rightValue, and operator (with type and operation)',
          severity: 'error',
          rationale: 'N8N UI requires complete condition structure for rendering',
          fix: 'Ensure each condition has: { leftValue: "={{ $json.field }}", rightValue: "value", operator: { type: "string", operation: "equals" } }',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-22T20:35:00+07:00',
    validatedBy: 'schema_inference',
    n8nVersion: '1.20.0',
  },
};
