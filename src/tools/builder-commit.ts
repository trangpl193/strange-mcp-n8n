/**
 * builder_commit - Commit the draft workflow to N8N
 *
 * Transforms the draft to N8N format and creates the workflow.
 * This is the final step of the builder process.
 */

import { McpError, McpErrorCode } from '@trangpl193/mcp-core';
import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import { getNodeMapping } from '../schemas/node-mappings.js';
import type { N8NClient } from '../services/n8n-client.js';
import type { N8NNode, N8NConnections } from '../types.js';
import type {
  BuilderCommitInput,
  BuilderCommitOutput,
  BuilderSession,
  DraftNode,
  DraftConnection,
} from '../services/builder-types.js';

export async function builderCommit(
  client: N8NClient,
  input: BuilderCommitInput
): Promise<BuilderCommitOutput> {
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
          recovery_hint: 'Call builder_resume to recreate session, then commit',
        },
      }
    );
  }

  try {
    // Validate draft has at least one node
    if (session.workflow_draft.nodes.length === 0) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        'Cannot commit empty workflow. Add at least one node first.',
        {
          data: {
            recovery_hint: 'Call builder_add_node to add nodes',
          },
        }
      );
    }

    // Validate workflow has at least one trigger node
    const triggerTypes = ['webhook', 'schedule', 'manual'];
    const hasTrigger = session.workflow_draft.nodes.some(node => {
      // Check simplified type (what builder uses) OR n8n_type if set
      const simplifiedType = node.type.toLowerCase();
      const n8nType = node.n8n_type || '';
      const baseType = n8nType.replace('n8n-nodes-base.', '');

      return simplifiedType === 'webhook' ||
             simplifiedType === 'schedule' ||
             simplifiedType === 'manual' ||
             baseType === 'webhook' ||
             baseType === 'scheduleTrigger' ||
             baseType === 'manualTrigger';
    });

    if (!hasTrigger) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        'Workflow must have at least one trigger node (webhook, schedule, or manual)',
        {
          data: {
            availableTriggers: triggerTypes,
            currentNodes: session.workflow_draft.nodes.map(n => n.type),
            recovery_hint: 'Add a trigger node using builder_add_node with type webhook, schedule, or manual',
          },
        }
      );
    }

    // Transform draft to N8N format
    const n8nWorkflow = transformDraftToN8N(session);

    // Create workflow in N8N (without 'active' - it's read-only in create API)
    const createdWorkflow = await client.createWorkflow({
      name: n8nWorkflow.name,
      nodes: n8nWorkflow.nodes,
      connections: n8nWorkflow.connections,
      settings: n8nWorkflow.settings,
    });

    // If activation requested, update the workflow to activate it
    let finalWorkflow = createdWorkflow;
    if (input.activate) {
      finalWorkflow = await client.updateWorkflow(createdWorkflow.id, {
        active: true,
      });
    }

    // Mark session as committed and delete
    session.status = 'committed';
    session.operations_log.push({
      operation: 'committed',
      timestamp: new Date().toISOString(),
      data: {
        workflow_id: createdWorkflow.id,
        nodes_count: n8nWorkflow.nodes.length,
      },
    });

    // Delete session (it's committed)
    await store.delete(input.session_id);

    return {
      success: true,
      workflow: {
        id: finalWorkflow.id,
        name: finalWorkflow.name,
        active: finalWorkflow.active,
        nodes_count: finalWorkflow.nodes.length,
      },
      session_closed: true,
    };
  } catch (error) {
    // Calculate retry count from operations_log
    const retryCount = session.operations_log.filter(
      (log) => log.operation === 'commit_failed'
    ).length;

    const timestamp = new Date().toISOString();

    // Add commit_failed operation to log
    session.operations_log.push({
      operation: 'commit_failed',
      timestamp,
      data: {
        error: error instanceof Error ? error.message : String(error),
        retry_count: retryCount,
      },
    });

    // Extend TTL by updating session (+30min)
    await store.update(session);

    // Prepare error details with recovery information
    const errorDetails: Record<string, unknown> = {
      session_id: input.session_id,
      session_status: 'active',
      ttl_extended: true,
      retry_count: retryCount,
      recovery_hint: 'Session kept alive. Fix the issue and retry builder_commit',
      original_error: error instanceof Error ? error.message : String(error),
    };

    // Optional safety: warn if retry count >= 5
    if (retryCount >= 5) {
      errorDetails.retry_limit_warning = `High retry count (${retryCount}). Consider using builder_discard if issue persists.`;
    }

    // Preserve original error details if it's an McpError
    if (error instanceof McpError && error.details) {
      errorDetails.validation_details = error.details;
    }

    // Throw McpError with recovery details
    throw new McpError(
      error instanceof McpError ? error.code : McpErrorCode.INTERNAL_ERROR,
      `Commit failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        data: errorDetails,
      }
    );
  }
}

/**
 * Transform builder draft to N8N workflow format
 */
function transformDraftToN8N(session: BuilderSession): {
  name: string;
  nodes: N8NNode[];
  connections: N8NConnections;
  settings: Record<string, unknown>;
} {
  const draft = session.workflow_draft;

  // Explicit name validation: Catch corrupted session state
  if (!draft.name || draft.name.trim() === '') {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      'builder_commit failed: Workflow name is missing or empty',
      {
        data: {
          hint: 'This indicates a corrupted session. The workflow name should have been set by builder_start.',
          recovery: [
            'Call builder_discard to clean up this session',
            'Start fresh with builder_start and provide a name',
          ],
          session_id: session.session_id,
        },
      }
    );
  }

  // Transform nodes
  const nodes: N8NNode[] = draft.nodes.map((draftNode) => {
    const mapping = getNodeMapping(draftNode.type);

    const n8nNode: N8NNode = {
      id: draftNode.id,
      name: draftNode.name,
      type: draftNode.n8n_type || mapping?.n8nType || `n8n-nodes-base.${draftNode.type}`,
      typeVersion: mapping?.typeVersion || 1,
      position: draftNode.position,
      parameters: draftNode.parameters,
    };

    // Add credentials if specified
    if (draftNode.credential && session.credentials.has(draftNode.credential)) {
      const credentialId = session.credentials.get(draftNode.credential)!;
      const credentialType = getCredentialType(draftNode.type);

      if (credentialType) {
        n8nNode.credentials = {
          [credentialType]: {
            id: credentialId,
            name: draftNode.credential,
          },
        };
      }
    }

    return n8nNode;
  });

  // Transform connections
  const connections: N8NConnections = {};

  // Validate: Check for branching nodes (Switch/If) and expected outputs
  const branchingNodeValidation = validateBranchingNodes(draft.nodes, draft.connections);
  if (!branchingNodeValidation.valid) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Invalid branching node configuration: ${branchingNodeValidation.error}`,
      {
        data: {
          node: branchingNodeValidation.nodeName,
          expected: branchingNodeValidation.expected,
          actual: branchingNodeValidation.actual,
          hint: 'Switch and If nodes require specific output configurations. Check your builder_connect calls.',
        },
      }
    );
  }

  for (const conn of draft.connections) {
    const fromNode = draft.nodes.find(
      (n) => n.name === conn.from_node || n.id === conn.from_node
    );

    if (!fromNode) continue;

    // FIX: Initialize with empty array, not [[]]
    // [[]] creates an empty connection at output 0, causing issues with Switch/If nodes
    // [] allows proper population of output indices on demand
    if (!connections[fromNode.name]) {
      connections[fromNode.name] = { main: [] };
    }

    // Ensure array exists for this output index
    const mainConnections = connections[fromNode.name]?.main;
    if (mainConnections) {
      while (mainConnections.length <= conn.from_output) {
        mainConnections.push([]);
      }

      const toNode = draft.nodes.find(
        (n) => n.name === conn.to_node || n.id === conn.to_node
      );

      if (toNode) {
        mainConnections[conn.from_output].push({
          node: toNode.name,
          type: 'main',
          index: conn.to_input,
        });
      }
    }
  }

  return {
    name: draft.name,
    nodes,
    connections,
    settings: draft.settings,
  };
}

/**
 * Get credential type for a node type
 */
function getCredentialType(nodeType: string): string | null {
  const credentialMap: Record<string, string> = {
    postgres: 'postgres',
    discord: 'discordApi',
    http: 'httpBasicAuth',
    // Add more as needed
  };

  return credentialMap[nodeType] || null;
}

/**
 * Validate branching nodes (Switch/If) have proper output configurations
 */
function validateBranchingNodes(
  nodes: DraftNode[],
  connections: DraftConnection[]
): {
  valid: boolean;
  error?: string;
  nodeName?: string;
  expected?: number;
  actual?: number;
} {
  const branchingNodes = nodes.filter((n) => {
    const baseType = n.type.replace('n8n-nodes-base.', '');
    return baseType === 'switch' || baseType === 'if';
  });

  for (const node of branchingNodes) {
    const nodeConnections = connections.filter(
      (c) => c.from_node === node.name || c.from_node === node.id
    );

    // Determine expected outputs
    let expectedOutputs = 0;
    const baseType = node.type.replace('n8n-nodes-base.', '');

    if (baseType === 'if') {
      expectedOutputs = 2; // Always has true/false outputs
    } else if (baseType === 'switch') {
      // Switch typeVersion 3.4 rules mode: outputs = rules.values.length (no separate fallback)
      const parameters = node.parameters as Record<string, any> | undefined;
      const rulesValues = parameters?.rules?.values as any[] | undefined;
      expectedOutputs = rulesValues ? rulesValues.length : 2; // Default 2 if no rules
    }

    // Check if all output indices are covered (at least one connection per output)
    const usedOutputs = new Set(nodeConnections.map((c) => c.from_output));

    // Warning: Not all outputs are used (optional - not an error)
    // We only error if output indices are out of range
    const maxOutputIndex = Math.max(...Array.from(usedOutputs), -1);

    if (maxOutputIndex >= expectedOutputs) {
      return {
        valid: false,
        error: `Output index ${maxOutputIndex} exceeds expected outputs`,
        nodeName: node.name,
        expected: expectedOutputs,
        actual: maxOutputIndex + 1,
      };
    }
  }

  return { valid: true };
}
