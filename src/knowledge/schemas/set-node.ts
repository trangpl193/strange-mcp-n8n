/**
 * Set Node Schema Definition
 *
 * Validated schema for N8N Set-node (n8n-nodes-base.set) typeVersion 3.
 *
 * Set node transforms data by adding, removing, or modifying fields.
 * Simpler alternative to Code node for basic data transformations.
 *
 * COMMON USE CASES:
 * - Add new fields to items
 * - Rename existing fields
 * - Remove unwanted fields
 * - Transform field values with expressions
 * - Combine fields from multiple sources
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/
 */

import type { NodeSchema } from '../types.js';

/**
 * Set Node Complete Schema
 *
 * Documents the configuration format for data transformation.
 * Uses field mappings to define transformations.
 */
export const setNodeSchema: NodeSchema = {
  nodeType: 'set',
  n8nType: 'n8n-nodes-base.set',
  typeVersion: 3,

  formats: [
    {
      name: 'manual_mapping',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          enum: ['manual', 'expression'],
          default: 'manual',
          description: 'Mapping mode: manual field mappings or expression-based',
        },
        duplicateItem: {
          type: 'boolean',
          default: false,
          description: 'Keep original item unchanged and create copy with modifications',
        },
        assignments: {
          type: 'object',
          description: 'Field assignments configuration',
          properties: {
            assignments: {
              type: 'array',
              description: 'Array of field assignments',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique assignment ID',
                  },
                  name: {
                    type: 'string',
                    description: 'Target field name',
                  },
                  value: {
                    type: 'string',
                    description: 'Value or expression',
                  },
                  type: {
                    type: 'string',
                    enum: ['string', 'number', 'boolean', 'array', 'object'],
                    description: 'Data type',
                  },
                },
              },
            },
          },
        },
        includeOtherFields: {
          type: 'boolean',
          default: true,
          description: 'Include fields not explicitly set (merge mode)',
        },
      },

      example: {
        minimal: {
          mode: 'manual',
          assignments: {
            assignments: [
              {
                id: 'field1',
                name: 'status',
                value: 'processed',
                type: 'string',
              },
            ],
          },
        },

        complete: {
          mode: 'manual',
          duplicateItem: false,
          includeOtherFields: true,
          assignments: {
            assignments: [
              {
                id: 'field1',
                name: 'fullName',
                value: '={{ $json.firstName + " " + $json.lastName }}',
                type: 'string',
              },
              {
                id: 'field2',
                name: 'totalPrice',
                value: '={{ $json.quantity * $json.price }}',
                type: 'number',
              },
              {
                id: 'field3',
                name: 'processed',
                value: 'true',
                type: 'boolean',
              },
              {
                id: 'field4',
                name: 'timestamp',
                value: '={{ new Date().toISOString() }}',
                type: 'string',
              },
            ],
          },
        },
      },

      notes:
        'Set node is ideal for simple data transformations without writing code. ' +
        'Use expressions (={{ ... }}) to access fields from previous nodes. ' +
        'Set includeOtherFields=true to merge new fields with existing ones. ' +
        'Set includeOtherFields=false to create items with only specified fields.',

      editorRequirements: [
        {
          id: 'assignments_required',
          name: 'Assignments Required',
          path: 'assignments.assignments',
          checkType: 'type',
          expected: { type: 'array', minLength: 1 },
          errorMessage: 'Missing or empty assignments.assignments array',
          severity: 'error',
          rationale: 'Set node requires at least one field assignment',
          fix: 'Add assignments: { assignments: [{ id: "field1", name: "fieldName", value: "value", type: "string" }] }',
        },
        {
          id: 'assignment_structure',
          name: 'Assignment Structure Valid',
          path: 'assignments.assignments[]',
          checkType: 'custom',
          customValidator: (params: any) => {
            const assignments = params?.assignments?.assignments || [];
            return assignments.every((a: any) =>
              a.id && a.name && a.value !== undefined && a.type
            );
          },
          errorMessage: 'Each assignment must have id, name, value, and type',
          severity: 'error',
          rationale: 'N8N UI requires complete assignment structure',
          fix: 'Ensure each assignment has: { id: "unique-id", name: "fieldName", value: "value", type: "string" }',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-24T13:20:00+07:00',
    validatedBy: 'schema_creation',
    n8nVersion: '1.76.1',
  },
};
