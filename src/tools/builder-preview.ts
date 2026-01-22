/**
 * builder_preview - Validate draft workflow before commit
 *
 * Phase 2B: Preview and validation
 * Returns errors (blocking) and warnings (non-blocking)
 */

import { McpError, McpErrorCode } from '@strange/mcp-core';
import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import type { N8NClient } from '../services/n8n-client.js';
import { schema_validate, quirks_check } from '../knowledge/index.js';

export interface BuilderPreviewInput {
  session_id: string;
}

export interface ValidationError {
  type: 'error';
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  type: 'warning';
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface BuilderPreviewOutput {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    nodes_count: number;
    connections_count: number;
    trigger_type: string | null;
    node_types: string[];
  };
}

/**
 * Preview and validate draft workflow
 */
export async function builderPreview(
  client: N8NClient,
  input: BuilderPreviewInput
): Promise<BuilderPreviewOutput> {
  const store = getUnifiedSessionStore();
  const session = await store.get(input.session_id);

  if (!session) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Builder session '${input.session_id}' not found`,
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

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const draft = session.workflow_draft;

  // Validation 1: Must have at least one node
  if (draft.nodes.length === 0) {
    errors.push({
      type: 'error',
      code: 'EMPTY_WORKFLOW',
      message: 'Workflow must have at least one node',
      context: { nodes_count: 0 },
    });
  }

  // Validation 2: Must have a trigger node
  const triggerTypes = ['webhook', 'schedule', 'manual', 'scheduleTrigger', 'manualTrigger'];
  const triggerNode = draft.nodes.find((node) => {
    const baseType = node.type.replace('n8n-nodes-base.', '');
    return triggerTypes.includes(baseType);
  });

  if (!triggerNode) {
    errors.push({
      type: 'error',
      code: 'NO_TRIGGER',
      message: 'Workflow must have at least one trigger node (webhook, schedule, or manual)',
      context: {
        available_triggers: ['webhook', 'schedule', 'manual'],
        current_nodes: draft.nodes.map((n) => n.type),
      },
    });
  }

  // Validation 3: Check for duplicate node names
  const nodeNames = draft.nodes.map((n) => n.name);
  const duplicates = nodeNames.filter((name, index) => nodeNames.indexOf(name) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'DUPLICATE_NAMES',
      message: `Found ${uniqueDuplicates.length} duplicate node name(s)`,
      context: {
        duplicate_names: uniqueDuplicates,
        suggestion: 'N8N will handle duplicates, but unique names are recommended',
      },
    });
  }

  // Validation 4: Check for orphaned nodes (no incoming connections)
  const connectedNodes = new Set<string>();
  draft.connections.forEach((conn) => {
    connectedNodes.add(conn.to_node);
  });

  const orphanedNodes = draft.nodes
    .filter((node) => {
      const isTrigger = triggerTypes.includes(node.type.replace('n8n-nodes-base.', ''));
      const isConnected = connectedNodes.has(node.name) || connectedNodes.has(node.id);
      return !isTrigger && !isConnected;
    })
    .map((n) => n.name);

  if (orphanedNodes.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'ORPHANED_NODES',
      message: `Found ${orphanedNodes.length} orphaned node(s) with no incoming connections`,
      context: {
        orphaned_nodes: orphanedNodes,
        suggestion: 'These nodes will not execute unless connected',
      },
    });
  }

  // Validation 5: Check for dead-end nodes (no outgoing connections, not terminal)
  const nodesWithOutput = new Set<string>();
  draft.connections.forEach((conn) => {
    nodesWithOutput.add(conn.from_node);
  });

  const deadEndNodes = draft.nodes
    .filter((node) => {
      const hasOutput = nodesWithOutput.has(node.name) || nodesWithOutput.has(node.id);
      const isRespondNode = node.type.includes('respond');
      return !hasOutput && !isRespondNode;
    })
    .map((n) => n.name);

  if (deadEndNodes.length > 0) {
    warnings.push({
      type: 'warning',
      code: 'DEAD_END_NODES',
      message: `Found ${deadEndNodes.length} node(s) with no outgoing connections`,
      context: {
        dead_end_nodes: deadEndNodes,
        suggestion: 'These nodes execute but their output is not used',
      },
    });
  }

  // Validation 6: Check for circular connections (basic detection)
  const circularPaths = detectCircularConnections(draft.connections);
  if (circularPaths.length > 0) {
    errors.push({
      type: 'error',
      code: 'CIRCULAR_CONNECTION',
      message: 'Detected circular connection(s) in workflow',
      context: {
        circular_paths: circularPaths,
        suggestion: 'Remove or restructure connections to prevent infinite loops',
      },
    });
  }

  // Validation 7: Check for invalid connections (non-existent nodes)
  const nodeIdsSet = new Set(draft.nodes.map((n) => n.id));
  const nodeNamesSet = new Set(draft.nodes.map((n) => n.name));

  const invalidConnections = draft.connections.filter((conn) => {
    const fromExists = nodeIdsSet.has(conn.from_node) || nodeNamesSet.has(conn.from_node);
    const toExists = nodeIdsSet.has(conn.to_node) || nodeNamesSet.has(conn.to_node);
    return !fromExists || !toExists;
  });

  if (invalidConnections.length > 0) {
    errors.push({
      type: 'error',
      code: 'INVALID_CONNECTION',
      message: `Found ${invalidConnections.length} connection(s) to non-existent nodes`,
      context: {
        invalid_connections: invalidConnections.map((c) => ({
          from: c.from_node,
          to: c.to_node,
        })),
      },
    });
  }

  // Validation 8: Check for required parameters (basic check for common node types)
  const paramValidation = validateNodeParameters(draft.nodes);
  errors.push(...paramValidation.errors);
  warnings.push(...paramValidation.warnings);

  // Validation 9 (Phase 3A Week 3): Knowledge layer schema validation
  const schemaValidation = await validateWithKnowledgeLayer(draft.nodes);
  warnings.push(...schemaValidation.warnings);
  if (schemaValidation.errors.length > 0) {
    errors.push(...schemaValidation.errors);
  }

  // Build summary
  const summary = {
    nodes_count: draft.nodes.length,
    connections_count: draft.connections.length,
    trigger_type: triggerNode?.type.replace('n8n-nodes-base.', '') || null,
    node_types: draft.nodes.map((n) => n.type.replace('n8n-nodes-base.', '')),
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

/**
 * Detect circular connections using DFS
 */
function detectCircularConnections(
  connections: Array<{ from_node: string; to_node: string }>
): string[][] {
  const graph = new Map<string, string[]>();

  // Build adjacency list
  connections.forEach((conn) => {
    if (!graph.has(conn.from_node)) {
      graph.set(conn.from_node, []);
    }
    graph.get(conn.from_node)!.push(conn.to_node);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        cycles.push(cycle);
      }
    }

    recStack.delete(node);
  }

  // Check all nodes
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Validate node parameters
 */
function validateNodeParameters(nodes: Array<{ type: string; name: string; parameters: Record<string, unknown> }>): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  nodes.forEach((node) => {
    const baseType = node.type.replace('n8n-nodes-base.', '');

    // Postgres validation
    if (baseType === 'postgres') {
      const operation = node.parameters.operation as string;
      if (operation === 'executeQuery' || operation === 'select') {
        const query = node.parameters.query as string;
        if (!query || query.trim() === '') {
          warnings.push({
            type: 'warning',
            code: 'MISSING_REQUIRED_PARAM',
            message: `Node '${node.name}' (postgres) is missing required parameter 'query'`,
            context: {
              node_name: node.name,
              node_type: baseType,
              missing_param: 'query',
            },
          });
        }
      }
    }

    // HTTP Request validation
    if (baseType === 'httpRequest') {
      const url = node.parameters.url as string;
      if (!url || url.trim() === '') {
        warnings.push({
          type: 'warning',
          code: 'MISSING_REQUIRED_PARAM',
          message: `Node '${node.name}' (httpRequest) is missing required parameter 'url'`,
          context: {
            node_name: node.name,
            node_type: baseType,
            missing_param: 'url',
          },
        });
      }
    }

    // Code node validation
    if (baseType === 'code') {
      const code = node.parameters.code as string;
      if (!code || code.trim() === '') {
        warnings.push({
          type: 'warning',
          code: 'MISSING_REQUIRED_PARAM',
          message: `Node '${node.name}' (code) has empty code parameter`,
          context: {
            node_name: node.name,
            node_type: baseType,
            missing_param: 'code',
          },
        });
      }
    }
  });

  return { errors, warnings };
}

/**
 * Validate nodes with knowledge layer schemas
 * Phase 3A Week 3: Integration with schema validation and quirks checking
 */
async function validateWithKnowledgeLayer(nodes: Array<{ type: string; name: string; parameters: Record<string, unknown> }>): Promise<{
  errors: ValidationError[];
  warnings: ValidationWarning[];
}> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const node of nodes) {
    const baseType = node.type.replace('n8n-nodes-base.', '');

    try {
      // Check for schema validation warnings
      const validationResult = await schema_validate(baseType, node.parameters);

      if (!validationResult.valid) {
        // Schema validation failed - this is an error
        validationResult.errors.forEach((err) => {
          errors.push({
            type: 'error',
            code: 'SCHEMA_VALIDATION_FAILED',
            message: `Node '${node.name}' (${baseType}): ${err.message}`,
            context: {
              node_name: node.name,
              node_type: baseType,
              expected_formats: err.expected,
              suggestion: validationResult.suggestion,
            },
          });
        });
      }

      // Add schema warnings (deprecated formats, UI-incompatible)
      validationResult.warnings.forEach((warn) => {
        warnings.push({
          type: 'warning',
          code: 'SCHEMA_WARNING',
          message: `Node '${node.name}' (${baseType}): ${warn.message}`,
          context: {
            node_name: node.name,
            node_type: baseType,
            suggestion: warn.suggestion,
            matched_format: validationResult.matchedFormat,
          },
        });
      });

      // Check for known quirks
      const quirks = await quirks_check(baseType);
      quirks.forEach((quirk) => {
        if (quirk.severity === 'critical') {
          warnings.push({
            type: 'warning',
            code: 'CRITICAL_QUIRK',
            message: `Node '${node.name}' (${baseType}): ${quirk.title}`,
            context: {
              node_name: node.name,
              node_type: baseType,
              quirk_id: quirk.id,
              workaround: quirk.workaround,
              auto_fix_available: quirk.autoFixAvailable,
              symptoms: quirk.symptoms,
            },
          });
        } else if (quirk.severity === 'warning') {
          warnings.push({
            type: 'warning',
            code: 'QUIRK_WARNING',
            message: `Node '${node.name}' (${baseType}): ${quirk.title}`,
            context: {
              node_name: node.name,
              node_type: baseType,
              quirk_id: quirk.id,
              workaround: quirk.workaround,
            },
          });
        }
      });
    } catch (error) {
      // Schema not found - skip validation for this node type
      // This is expected for nodes without knowledge layer schemas
      continue;
    }
  }

  return { errors, warnings };
}
