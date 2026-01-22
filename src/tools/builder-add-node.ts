/**
 * builder_add_node - Add a node to the draft workflow
 *
 * Adds a simplified node specification to the builder session.
 * Auto-generates position if not provided.
 */

import { McpError, McpErrorCode } from '@strange/mcp-core';
import { randomUUID } from 'crypto';
import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import { getNodeMapping, getDefaultNodeName } from '../schemas/node-mappings.js';
import type {
  BuilderAddNodeInput,
  BuilderAddNodeOutput,
  DraftNode,
} from '../services/builder-types.js';
import { BUILDER_CONSTANTS } from '../services/builder-types.js';

export async function builderAddNode(
  input: BuilderAddNodeInput
): Promise<BuilderAddNodeOutput> {
  const store = getUnifiedSessionStore();
  const session = await store.get(input.session_id);

  if (!session) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Builder session '${input.session_id}' not found or expired`,
      {
        details: {
          recovery_hint: 'Call builder_list to find active sessions, or builder_start to create new one',
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
          recovery_hint: 'Call builder_resume to recreate session from expired data',
          expired_at: session.expires_at,
        },
      }
    );
  }

  // Validate node type
  const nodeMapping = getNodeMapping(input.node.type);
  if (!nodeMapping) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Unknown node type '${input.node.type}'`,
      {
        details: {
          supported_types: ['webhook', 'schedule', 'manual', 'http', 'postgres', 'discord', 'code', 'if', 'switch', 'merge', 'set', 'respond'],
        },
      }
    );
  }

  // Generate node ID and name
  const nodeId = `node-${randomUUID().slice(0, 8)}`;
  const existingCount = session.workflow_draft.nodes.filter(
    (n) => n.type === input.node.type
  ).length;
  const nodeName = input.node.name ||
    `${getDefaultNodeName(input.node.type)}${existingCount > 0 ? ` ${existingCount + 1}` : ''}`;

  // Calculate position (auto-layout)
  const position = input.node.position || calculateNextPosition(session.workflow_draft.nodes);

  // Build parameters from config
  const parameters = buildParameters(
    input.node.type,
    input.node.action,
    input.node.config || {}
  );

  const draftNode: DraftNode = {
    id: nodeId,
    name: nodeName,
    type: input.node.type,
    n8n_type: nodeMapping.n8nType,
    parameters,
    position,
    credential: input.node.credential,
  };

  // Add to draft
  session.workflow_draft.nodes.push(draftNode);

  // Log operation
  session.operations_log.push({
    operation: 'add_node',
    timestamp: new Date().toISOString(),
    details: {
      node_id: nodeId,
      node_name: nodeName,
      node_type: input.node.type,
    },
  });

  // Update session
  await store.update(session);

  const nodesCount = session.workflow_draft.nodes.length;

  return {
    success: true,
    node_id: nodeId,
    node_name: nodeName,
    nodes_count: nodesCount,
    hint: nodesCount === 1
      ? 'First node added. Add more nodes or call builder_connect to link them.'
      : `${nodesCount} nodes in draft. Call builder_connect to link them, or builder_commit when ready.`,
  };
}

/**
 * Calculate next node position (simple horizontal layout)
 */
function calculateNextPosition(existingNodes: DraftNode[]): [number, number] {
  if (existingNodes.length === 0) {
    return [...BUILDER_CONSTANTS.DEFAULT_START_POSITION];
  }

  // Find rightmost node
  const maxX = Math.max(...existingNodes.map((n) => n.position[0]));
  const avgY = existingNodes.reduce((sum, n) => sum + n.position[1], 0) / existingNodes.length;

  return [maxX + BUILDER_CONSTANTS.DEFAULT_NODE_SPACING, Math.round(avgY)];
}

/**
 * Build N8N parameters from simplified config
 */
function buildParameters(
  type: string,
  action: string | undefined,
  config: Record<string, unknown>
): Record<string, unknown> {
  // Base parameters from config
  const params: Record<string, unknown> = { ...config };

  // Type-specific parameter mapping
  switch (type) {
    case 'postgres':
      if (action === 'query' || action === 'executeQuery') {
        params.operation = 'executeQuery';
      } else if (action === 'insert') {
        params.operation = 'insert';
      } else if (action === 'update') {
        params.operation = 'update';
      } else if (action === 'delete') {
        params.operation = 'delete';
      }
      break;

    case 'http':
      params.method = config.method || 'GET';
      if (config.url) params.url = config.url;
      break;

    case 'webhook':
      params.httpMethod = config.method || 'POST';
      if (config.path) params.path = config.path;
      break;

    case 'schedule':
      // Default: daily at midnight
      if (!params.rule) {
        params.rule = {
          interval: [{ field: 'days', triggerAtHour: 0 }],
        };
      }
      break;

    case 'code':
      params.jsCode = config.code || config.jsCode || '// Add your code here\nreturn items;';
      params.mode = 'runOnceForAllItems';
      break;

    case 'discord':
      if (config.content) params.content = config.content;
      if (config.channelId) params.channelId = config.channelId;
      break;

    case 'respond':
      params.respondWith = 'text';
      if (config.statusCode) params.options = { responseCode: config.statusCode };
      if (config.body) params.responseBody = config.body;
      break;
  }

  return params;
}
