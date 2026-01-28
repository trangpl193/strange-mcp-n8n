/**
 * builder_connect - Connect two nodes in the draft workflow
 *
 * Creates a connection between two nodes by name or ID.
 */

import { McpError, McpErrorCode } from '@trangpl193/mcp-core';
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
        data: {
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
        data: {
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
      `Source node '${input.from_node}' not found in workflow`,
      {
        data: {
          available_nodes: session.workflow_draft.nodes.map((n) => n.name),
          recovery_hint: 'Check node name or use builder_preview to see current nodes',
        },
      }
    );
  }

  // Validate output index using metadata
  const expectedOutputs = fromNode.metadata?.expected_outputs || 1;
  const fromOutput = input.from_output ?? 0;

  if (fromOutput >= expectedOutputs) {
    // Build rich error context (P0-3)
    const baseType = fromNode.type.replace('n8n-nodes-base.', '');
    const isSwitch = baseType === 'switch';
    const isIf = baseType === 'if';

    // Get rules count for switch nodes
    const parameters = fromNode.parameters as Record<string, any> | undefined;
    const rulesCount = isSwitch
      ? (parameters?.rules?.values?.length as number | undefined)
      : null;

    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Connection failed: Node '${fromNode.name}' only has ${expectedOutputs} output(s)`,
      {
        data: {
          // WHO
          node_name: fromNode.name,
          node_type: fromNode.type,
          node_id: fromNode.id,
          node_category: fromNode.metadata?.node_category,

          // WHAT
          error: `Output index ${fromOutput} exceeds expected outputs`,
          requested_output: fromOutput,
          expected_outputs: expectedOutputs,
          valid_range: `0 to ${expectedOutputs - 1}`,

          // WHY (node-specific explanation)
          ...(isSwitch && {
            rules_count: rulesCount,
            explanation: `Switch node with ${rulesCount} rules has ${expectedOutputs} outputs (typeVersion 3.4: outputs = rules count, no separate fallback output)`,
          }),
          ...(isIf && {
            explanation:
              'If nodes always have exactly 2 outputs: [0] = true branch, [1] = false branch',
          }),
          ...(!isSwitch &&
            !isIf && {
              explanation: `${baseType} nodes have ${expectedOutputs} output(s)`,
            }),

          // HOW TO FIX
          fix: {
            action: 'Change from_output parameter in builder_connect call',
            parameter: 'from_output',
            current_value: fromOutput,
            suggested_value: expectedOutputs - 1,
            example: `builder_connect({ sessionId: '${input.session_id}', fromNode: '${fromNode.name}', toNode: '${input.to_node}', from_output: ${expectedOutputs - 1} })`,
          },

          // CONTEXT: Show existing connections from this node
          existing_connections: session.workflow_draft.connections
            .filter(
              (c) =>
                c.from_node === fromNode.name || c.from_node === fromNode.id
            )
            .map((c) => ({
              to_node: c.to_node,
              from_output: c.from_output,
              valid: c.from_output < expectedOutputs,
              status: c.from_output < expectedOutputs ? '✅' : '❌',
            })),

          // REFERENCE
          reference:
            isSwitch || isIf
              ? 'See ~/.claude/skills/x--infra--n8n-workflow/references/node-quirks.yaml for branching node formats'
              : null,
        },
      }
    );
  }

  // Find target node
  const toNode = findNode(session.workflow_draft.nodes, input.to_node);
  if (!toNode) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Target node '${input.to_node}' not found in workflow`,
      {
        data: {
          available_nodes: session.workflow_draft.nodes.map((n) => n.name),
          recovery_hint: 'Check node name or use builder_preview to see current nodes',
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

  // Add connection (using validated fromOutput)
  session.workflow_draft.connections.push({
    from_node: fromNode.name,
    to_node: toNode.name,
    from_output: fromOutput,
    to_input: input.to_input ?? 0,
  });

  // Log operation
  session.operations_log.push({
    operation: 'connect',
    timestamp: new Date().toISOString(),
    data: {
      from: fromNode.name,
      to: toNode.name,
    },
  });

  // Update session
  await store.update(session);

  return {
    success: true,
    connection: {
      from: fromNode.name,
      to: toNode.name,
      from_output: fromOutput,
      to_input: input.to_input ?? 0,
    },
    connections_count: session.workflow_draft.connections.length,
    validation: {
      output_index_valid: true,
      validated_against_metadata: true,
    },
  };
}

/**
 * Find a node by name or ID
 */
function findNode(nodes: DraftNode[], identifier: string): DraftNode | undefined {
  return nodes.find((n) => n.id === identifier || n.name === identifier);
}
