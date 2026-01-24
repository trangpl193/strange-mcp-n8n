/**
 * Code Node Schema Definition
 *
 * Validated schema for N8N Code-node (n8n-nodes-base.code) typeVersion 2.
 *
 * Code node executes custom JavaScript or Python code for data transformation
 * and custom logic. Provides full programmatic control over data processing.
 *
 * COMMON USE CASES:
 * - Complex data transformations
 * - Custom business logic
 * - Data validation and cleaning
 * - Math calculations and aggregations
 * - Custom API response parsing
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/
 */

import type { NodeSchema } from '../types.js';

/**
 * Code Node Complete Schema
 *
 * Documents the configuration format for custom code execution.
 * Supports JavaScript (Node.js) and Python.
 */
export const codeNodeSchema: NodeSchema = {
  nodeType: 'code',
  n8nType: 'n8n-nodes-base.code',
  typeVersion: 2,

  formats: [
    {
      name: 'code',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          enum: ['runOnceForAllItems', 'runOnceForEachItem'],
          default: 'runOnceForAllItems',
          description: 'Execution mode: process all items at once or one by one',
        },
        language: {
          type: 'string',
          enum: ['javaScript', 'python'],
          default: 'javaScript',
          description: 'Programming language',
        },
        jsCode: {
          type: 'string',
          description: 'JavaScript code to execute (when language="javaScript")',
        },
        pythonCode: {
          type: 'string',
          description: 'Python code to execute (when language="python")',
        },
      },

      example: {
        minimal: {
          mode: 'runOnceForAllItems',
          language: 'javaScript',
          jsCode: 'return items;',
        },

        complete: {
          mode: 'runOnceForAllItems',
          language: 'javaScript',
          jsCode: `// Process all items
const processedItems = items.map(item => ({
  json: {
    ...item.json,
    processed: true,
    timestamp: new Date().toISOString(),
    total: item.json.quantity * item.json.price
  }
}));

return processedItems;`,
        },
      },

      notes:
        'Code node has access to "items" array (all input items) and must return items array. ' +
        'Use mode="runOnceForAllItems" for batch processing (faster). ' +
        'Use mode="runOnceForEachItem" when you need to process items individually. ' +
        'JavaScript has access to Node.js built-in modules. Python support requires Python runtime.',

      editorRequirements: [
        {
          id: 'code_required',
          name: 'Code Required',
          path: 'jsCode',
          checkType: 'custom',
          customValidator: (params: any) => {
            const lang = params?.language || 'javaScript';
            if (lang === 'javaScript') {
              return !!params?.jsCode;
            } else if (lang === 'python') {
              return !!params?.pythonCode;
            }
            return false;
          },
          errorMessage: 'Missing code - jsCode required for JavaScript, pythonCode for Python',
          severity: 'error',
          rationale: 'Code node requires executable code',
          fix: 'Add jsCode: "return items;" for JavaScript or pythonCode: "return items" for Python',
        },
        {
          id: 'execution_mode',
          name: 'Execution Mode',
          path: 'mode',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing mode field',
          severity: 'warning',
          rationale: 'Defaults to runOnceForAllItems, but explicit is clearer',
          fix: 'Add mode: "runOnceForAllItems" or "runOnceForEachItem"',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-24T13:15:00+07:00',
    validatedBy: 'schema_creation',
    n8nVersion: '1.76.1',
  },
};
