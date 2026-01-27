import { ExecutionMetadata, createMetadataFromStart } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';

export interface NodeGetInput {
  workflow_id: string;
  node_identifier: string; // Node name or ID
}

export interface NodeGetOutput {
  node: {
    id: string;
    name: string;
    type: string;
    type_version: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, { id: string; name: string }>;
    disabled?: boolean;
  };
  workflow: {
    id: string;
    name: string;
    active: boolean;
    nodes_count: number;
  };
  meta: ExecutionMetadata;
}

/**
 * Get a single node from a workflow
 *
 * This tool abstracts the complexity of fetching full workflow
 * and extracting just the node you need.
 *
 * Use cases:
 * - View current node configuration before updating
 * - Check node parameters for debugging
 * - Understand node type and credentials
 */
export async function nodeGet(
  client: N8NClient,
  input: NodeGetInput
): Promise<NodeGetOutput> {
  const startTime = Date.now();

  // Fetch node using client helper
  const { node, workflow } = await client.getNode(
    input.workflow_id,
    input.node_identifier
  );

  // Build response with execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    node: {
      id: node.id,
      name: node.name,
      type: node.type,
      type_version: node.typeVersion,
      position: node.position,
      parameters: node.parameters,
      credentials: node.credentials,
      disabled: (node as any).disabled,
    },
    workflow: {
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      nodes_count: workflow.nodes.length,
    },
    meta,
  };
}
