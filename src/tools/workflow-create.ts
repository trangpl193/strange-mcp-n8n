import { createMetadataFromStart, ExecutionMetadata, McpError, McpErrorCode } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';
import { WorkflowTransformer } from '../services/workflow-transformer.js';
import type { SimplifiedWorkflow } from '../schemas/simplified-workflow.js';
import type { N8NWorkflow } from '../types.js';
import { workflowValidateRender, type ValidationError } from './workflow-validate-render.js';

export interface WorkflowCreateInput {
  workflow: SimplifiedWorkflow;
  credentials?: Record<string, string>;  // Map of credential name → credential ID
  activate?: boolean;                     // Activate workflow after creation
  validate?: boolean;                     // Validate workflow rendering after creation (default: true)
}

export interface WorkflowCreateOutput {
  workflow_id: string;
  name: string;
  active: boolean;
  nodes_count: number;
  created_at: string;
  validation?: {                          // Validation results (present if validate !== false)
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
  };
  meta: ExecutionMetadata;
}

/**
 * Create workflow from simplified schema
 */
export async function workflowCreate(
  client: N8NClient,
  input: WorkflowCreateInput
): Promise<WorkflowCreateOutput> {
  const startTime = Date.now();

  // Validate workflow has at least one trigger node
  const triggerTypes = ['webhook', 'schedule', 'manual'];
  const hasTrigger = input.workflow.steps.some(step =>
    triggerTypes.includes(step.type.toLowerCase())
  );

  if (!hasTrigger) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      'Workflow must have at least one trigger node (webhook, schedule, or manual)',
      {
        details: {
          availableTriggers: triggerTypes,
          providedSteps: input.workflow.steps.map(s => s.type),
        },
      }
    );
  }

  // Build credential map
  const credentialMap = new Map<string, string>();
  if (input.credentials) {
    Object.entries(input.credentials).forEach(([name, id]) => {
      credentialMap.set(name, id);
    });
  }

  // Transform simplified workflow to N8N format
  const transformer = new WorkflowTransformer(credentialMap);
  const workflowData = transformer.transform(input.workflow);

  // Create workflow via N8N API
  // Note: N8N API treats 'active' as read-only on POST/PUT, so we omit it
  const response: N8NWorkflow = await client.createWorkflow({
    name: workflowData.name!,
    nodes: workflowData.nodes!,
    connections: workflowData.connections!,
    settings: workflowData.settings,
  });

  // If activation requested, use separate endpoint
  let finalActive = response.active;
  if (input.activate === true && !response.active) {
    try {
      await client.activateWorkflow(response.id);
      finalActive = true;
    } catch (activateError) {
      // Workflow created but activation failed - continue with inactive state
      console.warn(`Workflow created but activation failed: ${activateError}`);
    }
  }

  // Optional post-creation validation (default: enabled)
  let validationResult: WorkflowCreateOutput['validation'] = undefined;
  if (input.validate !== false) {
    try {
      const validation = await workflowValidateRender(client, {
        workflow_id: response.id,
      });

      // Check for webhook nodes and add warning
      const hasWebhookNode = input.workflow.steps.some(step =>
        step.type.toLowerCase() === 'webhook'
      );

      const warnings = [...validation.warnings];
      if (hasWebhookNode) {
        warnings.push(
          '⚠️ WEBHOOK NODE DETECTED: You MUST open this workflow in n8n UI and save it to generate webhookId. ' +
          `Open: ${client.baseUrl.replace('/api/v1', '')}/workflow/${response.id} ` +
          'Then make any change (e.g., move node) and save (Ctrl+S). ' +
          'Without this step, webhook endpoints will return 404. ' +
          'See docs/WEBHOOK_BEHAVIOR.md for details.'
        );
      }

      validationResult = {
        valid: validation.valid,
        errors: validation.errors,
        warnings,
      };
    } catch (validationError) {
      // Validation failed - include error in warnings
      validationResult = {
        valid: false,
        errors: [],
        warnings: [`Validation check failed: ${validationError}`],
      };
    }
  }

  // Execution metadata
  const meta: ExecutionMetadata = createMetadataFromStart(startTime, '1.2.0');

  return {
    workflow_id: response.id,
    name: response.name,
    active: finalActive,
    nodes_count: response.nodes.length,
    created_at: response.createdAt,
    validation: validationResult,
    meta,
  };
}
