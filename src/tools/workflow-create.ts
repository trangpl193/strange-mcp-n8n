import { createMetadataFromStart, ExecutionMetadata } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import { WorkflowTransformer } from '../services/workflow-transformer.js';
import type { SimplifiedWorkflow } from '../schemas/simplified-workflow.js';
import type { N8NWorkflow } from '../types.js';

export interface WorkflowCreateInput {
  workflow: SimplifiedWorkflow;
  credentials?: Record<string, string>;  // Map of credential name → credential ID
  activate?: boolean;                     // Activate workflow after creation
}

export interface WorkflowCreateOutput {
  workflow_id: string;
  name: string;
  active: boolean;
  nodes_count: number;
  created_at: string;
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

  // Execution metadata
  const meta: ExecutionMetadata = createMetadataFromStart(startTime, '1.2.0');

  return {
    workflow_id: response.id,
    name: response.name,
    active: finalActive,
    nodes_count: response.nodes.length,
    created_at: response.createdAt,
    meta,
  };
}
