import { ExecutionMetadata, createMetadataFromStart } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NWorkflow, N8NNode } from '../types.js';

export interface WorkflowGetInput {
  workflow_id: string;
}

export interface WorkflowNodeDetail {
  id: string;
  name: string;
  type: string;
  type_version: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface WorkflowConnectionDetail {
  from: string;
  to: string;
  type: string;
}

export interface WorkflowGetOutput {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  nodes: WorkflowNodeDetail[];
  connections: WorkflowConnectionDetail[];
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  meta: ExecutionMetadata;
}

/**
 * Get workflow details by ID
 */
export async function workflowGet(
  client: N8NClient,
  input: WorkflowGetInput
): Promise<WorkflowGetOutput> {
  const startTime = Date.now();

  // Get workflow from N8N API
  const workflow: N8NWorkflow = await client.getWorkflow(input.workflow_id);

  // Transform nodes to detail format
  const nodes: WorkflowNodeDetail[] = workflow.nodes.map((node: N8NNode) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    type_version: node.typeVersion,
    position: node.position,
    parameters: node.parameters,
    credentials: node.credentials,
  }));

  // Transform connections to simple format
  const connections: WorkflowConnectionDetail[] = [];
  Object.entries(workflow.connections).forEach(([sourceNode, targets]) => {
    targets.main?.forEach((targetGroup) => {
      targetGroup.forEach((target) => {
        connections.push({
          from: sourceNode,
          to: target.node,
          type: target.type,
        });
      });
    });
  });

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    id: workflow.id,
    name: workflow.name,
    active: workflow.active,
    tags: workflow.tags || [],
    nodes,
    connections,
    settings: workflow.settings || {},
    created_at: workflow.createdAt,
    updated_at: workflow.updatedAt,
    meta,
  };
}
