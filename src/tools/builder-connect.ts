/**
 * builder_connect - Connect two nodes in the draft workflow
 *
 * Creates a connection between two nodes by name or ID.
 */

import { McpError, McpErrorCode } from '@strange/mcp-core';
import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import type {
  BuilderConnectInput,
  BuilderConnectOutput,
  DraftNode,
} from '../services/builder-types.js';

export async function builderConnect(
  input: BuilderConnectInput
): Promise<BuilderConnectOutput> {
  const store = getUnifiedSessionStore();
  const session = await store.get(input.session_id);

  if (!session) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Builder session '${input.session_id}' not found or expired`,
      {
        details: {
          recovery_hint: 'Call builder_list to find active sessions',
        },
      }
    );
  }

  if (session.status === 'expired') {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Builder session '${input.session_id}' has expired`,
      {
        details: {
          recovery_hint: 'Call builder_resume to recreate session',
        },
      }
    );
  }

  // Find source node
  const fromNode = findNode(session.workflow_draft.nodes, input.from_node);
  if (!fromNode) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Source node '${input.from_node}' not found in draft`,
      {
        details: {
          available_nodes: session.workflow_draft.nodes.map((n) => n.name),
        },
      }
    );
  }

  // Find target node
  const toNode = findNode(session.workflow_draft.nodes, input.to_node);
  if (!toNode) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Target node '${input.to_node}' not found in draft`,
      {
        details: {
          available_nodes: session.workflow_draft.nodes.map((n) => n.name),
        },
      }
    );
  }

  // Prevent self-connection
  if (fromNode.id === toNode.id) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      'Cannot connect a node to itself'
    );
  }

  // Check for duplicate connection
  const existingConnection = session.workflow_draft.connections.find(
    (c) =>
      (c.from_node === fromNode.name || c.from_node === fromNode.id) &&
      (c.to_node === toNode.name || c.to_node === toNode.id)
  );

  if (existingConnection) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Connection from '${fromNode.name}' to '${toNode.name}' already exists`
    );
  }

  // Add connection
  session.workflow_draft.connections.push({
    from_node: fromNode.name,
    to_node: toNode.name,
    from_output: input.from_output ?? 0,
    to_input: input.to_input ?? 0,
  });

  // Log operation
  session.operations_log.push({
    operation: 'connect',
    timestamp: new Date().toISOString(),
    details: {
      from: fromNode.name,
      to: toNode.name,
    },
  });

  // Update session
  await store.update(session);

  return {
    success: true,
    connection: {
      from: `${fromNode.name}[${input.from_output ?? 0}]`,
      to: `${toNode.name}[${input.to_input ?? 0}]`,
    },
    connections_count: session.workflow_draft.connections.length,
  };
}

/**
 * Find a node by name or ID
 */
function findNode(nodes: DraftNode[], identifier: string): DraftNode | undefined {
  return nodes.find((n) => n.id === identifier || n.name === identifier);
}
