import { ExecutionMetadata, createMetadataFromStart } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';

export interface NodeUpdateInput {
  workflow_id: string;
  node_identifier: string; // Node name or ID

  // Updates to apply (all optional, only specified fields will be updated)
  name?: string;           // Rename the node
  parameters?: Record<string, unknown>;  // Update node parameters (merged with existing)
  position?: [number, number];  // Move node position
  disabled?: boolean;      // Enable/disable node
}

export interface NodeUpdateOutput {
  success: boolean;
  node: {
    id: string;
    name: string;
    type: string;
    updated_fields: string[];
  };
  workflow: {
    id: string;
    name: string;
    updated_at: string;
  };
  meta: ExecutionMetadata;
}

/**
 * Update a single node in a workflow
 *
 * This tool handles the complexity of:
 * 1. Fetching the full workflow
 * 2. Finding and modifying the specific node
 * 3. Updating connections if node is renamed
 * 4. Sending the full PUT request to N8N
 *
 * Use cases:
 * - Fix SQL query in a Postgres node
 * - Update JavaScript code in a Code node
 * - Rename a node
 * - Disable/enable a node
 * - Change node position
 *
 * Note: Parameters are MERGED with existing, not replaced.
 * To remove a parameter, set it to null.
 */
export async function nodeUpdate(
  client: N8NClient,
  input: NodeUpdateInput
): Promise<NodeUpdateOutput> {
  const startTime = Date.now();

  // Build updates object from input
  const updates: {
    name?: string;
    parameters?: Record<string, any>;
    position?: [number, number];
    disabled?: boolean;
  } = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.parameters !== undefined) updates.parameters = input.parameters;
  if (input.position !== undefined) updates.position = input.position;
  if (input.disabled !== undefined) updates.disabled = input.disabled;

  // Update node using client helper
  const { node, workflow, updatedFields } = await client.updateNode(
    input.workflow_id,
    input.node_identifier,
    updates
  );

  // Build response with execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    success: true,
    node: {
      id: node.id,
      name: node.name,
      type: node.type,
      updated_fields: updatedFields,
    },
    workflow: {
      id: workflow.id,
      name: workflow.name,
      updated_at: workflow.updatedAt,
    },
    meta,
  };
}
