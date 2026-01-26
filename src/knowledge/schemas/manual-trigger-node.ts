/**
 * Manual Trigger Node Schema Definition
 *
 * Validated schema for N8N Manual Trigger node (n8n-nodes-base.manualTrigger) typeVersion 1.
 *
 * Manual Trigger is the simplest trigger node - executes workflow manually via UI button or API.
 * No configuration needed, making it ideal for testing and development workflows.
 *
 * COMMON USE CASES:
 * - Testing and development workflows
 * - Manual data processing tasks
 * - On-demand report generation
 * - UAT and validation workflows
 *
 * TOKEN EFFICIENCY NOTE:
 * This schema is intentionally minimal as manualTrigger has no required parameters.
 * Most instances use default empty parameters object.
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualtrigger/
 */

import type { NodeSchema } from '../types.js';

/**
 * Manual Trigger Node Complete Schema
 *
 * Documents the configuration format for manual trigger nodes.
 * This is a trigger-only node with no parameters.
 */
export const manualTriggerNodeSchema: NodeSchema = {
  nodeType: 'manual',
  n8nType: 'n8n-nodes-base.manualTrigger',
  typeVersion: 1,

  formats: [
    {
      name: 'manual_trigger',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        // Manual trigger has no required parameters
        // parameters object can be empty or contain optional execution settings
      },

      example: {
        minimal: {
          // Empty parameters - most common case
        },

        complete: {
          // Manual trigger typically has no parameters
          // Some workflows may include metadata but it's not required
        },
      },

      notes:
        'Manual Trigger has no required configuration. It executes when user clicks "Execute Workflow" ' +
        'button in N8N UI or triggers via API. Parameters object can be empty. ' +
        'Always starts workflow execution, unlike webhook/schedule which wait for external events.',

      editorRequirements: [
        {
          id: 'no_parameters_needed',
          name: 'No Configuration Required',
          path: '',
          checkType: 'custom',
          expected: { type: 'object' },
          errorMessage: 'Manual trigger requires no configuration',
          severity: 'info',
          rationale: 'Manual trigger works with empty parameters object',
          fix: 'No action needed - manual trigger is ready to use',
        },
      ],
    },
  ],

  metadata: {
    source: 'n8n_documentation_and_real_world_usage',
    validatedDate: '2026-01-25T12:47:00+07:00',
    validatedBy: 'workflow_analysis',
    n8nVersion: '1.76.1',
    notes: 'Most frequently used trigger node in test and UAT workflows. Zero configuration required.',
  },
};
