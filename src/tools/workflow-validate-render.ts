import { ExecutionMetadata, createMetadataFromStart } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NWorkflow, N8NNode, N8NConnections } from '../types.js';
import { schema_validate } from '../knowledge/index.js';

export interface WorkflowValidateRenderInput {
  workflow_id: string;
}

export interface ValidationError {
  node_id: string;
  node_name: string;
  error: string;
  field?: string;
  details?: string;
}

export interface WorkflowValidateRenderOutput {
  success: boolean;
  valid: boolean;
  workflow_id: string;
  workflow_name: string;
  errors: ValidationError[];
  warnings: string[];
  meta: ExecutionMetadata;
}

/**
 * Validate that a workflow can be rendered in N8N UI editor
 *
 * This tool performs editor-specific validation checks that go beyond
 * simple API storage validation. It detects issues that would cause
 * the N8N editor to fail rendering the workflow canvas.
 *
 * Common issues detected:
 * - Missing required node parameters
 * - Invalid connection structures
 * - Incorrect parameter formats for branching nodes (If, Switch)
 * - Missing or malformed conditions
 * - Empty or invalid operator structures
 */
export async function workflowValidateRender(
  client: N8NClient,
  input: WorkflowValidateRenderInput
): Promise<WorkflowValidateRenderOutput> {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  try {
    // Fetch workflow from N8N
    const workflow: N8NWorkflow = await client.getWorkflow(input.workflow_id);

    // Validate nodes (async now with schema validation)
    for (const node of workflow.nodes) {
      await validateNode(node, errors, warnings);
    }

    // Validate connections
    validateConnections(workflow.nodes, workflow.connections, errors, warnings);

    // Execution metadata
    const meta = createMetadataFromStart(startTime, '1.2.0');

    return {
      success: true,
      valid: errors.length === 0,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      errors,
      warnings,
      meta,
    };
  } catch (error: any) {
    // If workflow fetch fails, return error
    const meta = createMetadataFromStart(startTime, '1.2.0');
    return {
      success: false,
      valid: false,
      workflow_id: input.workflow_id,
      workflow_name: 'Unknown',
      errors: [{
        node_id: '',
        node_name: '',
        error: `Failed to fetch workflow: ${error.message}`,
      }],
      warnings: [],
      meta,
    };
  }
}

/**
 * Validate a single node for render-ability
 * ✨ Tier 2: Now uses schema-driven validation instead of hardcoded checks
 */
async function validateNode(
  node: N8NNode,
  errors: ValidationError[],
  warnings: string[]
): Promise<void> {
  // Basic structure checks
  if (!node.id || !node.name || !node.type) {
    errors.push({
      node_id: node.id || 'unknown',
      node_name: node.name || 'unknown',
      error: 'Missing required node fields (id, name, type)',
    });
    return;
  }

  // Check for parameters object
  if (!node.parameters) {
    warnings.push(`Node "${node.name}" has no parameters object`);
    return;
  }

  // ✨ NEW: Use schema-driven validation (Tier 2)
  try {
    const nodeType = simplifyNodeType(node.type);
    const validation = await schema_validate(
      nodeType,
      node.parameters,
      node.typeVersion
    );

    if (!validation.valid || !validation.editorCompatible) {
      // Add schema validation errors
      for (const error of validation.errors) {
        errors.push({
          node_id: node.id,
          node_name: node.name,
          error: error.message,
          field: error.path,
        });
      }
    }

    // Add warnings from schema validation
    for (const warning of validation.warnings) {
      warnings.push(
        `${node.name}: ${warning.message}${warning.suggestion ? ' - ' + warning.suggestion : ''}`
      );
    }

    // Add editor issues as errors with fix suggestions
    if (validation.editorIssues) {
      for (const issue of validation.editorIssues) {
        if (issue.severity === 'error') {
          errors.push({
            node_id: node.id,
            node_name: node.name,
            error: issue.errorMessage,
            field: issue.path,
            data: issue.fix,
          });
        }
      }
    }
  } catch (err) {
    // Schema not found for this node type - skip validation
    // Not all node types have schemas yet (only if, switch, filter)
  }
}

/**
 * Helper: Simplify N8N node type to simplified identifier
 * @example "n8n-nodes-base.if" -> "if"
 */
function simplifyNodeType(n8nType: string): string {
  return n8nType.split('.').pop() || n8nType;
}

/**
 * Validate workflow connections structure
 */
function validateConnections(
  nodes: N8NNode[],
  connections: N8NConnections,
  errors: ValidationError[],
  warnings: string[]
): void {
  const nodeNames = new Set(nodes.map(n => n.name));

  // Check each source node's connections
  Object.entries(connections).forEach(([sourceName, targets]) => {
    // Check source node exists
    if (!nodeNames.has(sourceName)) {
      errors.push({
        node_id: '',
        node_name: sourceName,
        error: `Connection source node "${sourceName}" not found in workflow`,
        data: 'Connection references non-existent node',
      });
      return;
    }

    // Check main connections
    if (!targets.main || !Array.isArray(targets.main)) {
      errors.push({
        node_id: '',
        node_name: sourceName,
        error: `Node "${sourceName}" has invalid connections.main structure`,
        field: 'connections.main',
        data: 'Must be an array of output port arrays',
      });
      return;
    }

    // Validate each output port
    targets.main.forEach((outputPort, outputIndex) => {
      if (!Array.isArray(outputPort)) {
        errors.push({
          node_id: '',
          node_name: sourceName,
          error: `Node "${sourceName}" output ${outputIndex} is not an array`,
          field: `connections.main[${outputIndex}]`,
        });
        return;
      }

      // Validate each target connection
      outputPort.forEach((target, targetIndex) => {
        if (!target.node) {
          errors.push({
            node_id: '',
            node_name: sourceName,
            error: `Node "${sourceName}" output ${outputIndex} target ${targetIndex} missing node name`,
            field: `connections.main[${outputIndex}][${targetIndex}].node`,
          });
        } else if (!nodeNames.has(target.node)) {
          errors.push({
            node_id: '',
            node_name: sourceName,
            error: `Connection target node "${target.node}" not found in workflow`,
            data: `Source: "${sourceName}" → Target: "${target.node}"`,
          });
        }

        if (typeof target.index !== 'number') {
          errors.push({
            node_id: '',
            node_name: sourceName,
            error: `Connection from "${sourceName}" to "${target.node}" missing target input index`,
            field: 'connections.main.index',
          });
        }
      });
    });
  });

  // Check for branching nodes with only 1 output
  nodes.forEach(node => {
    if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
      const nodeConnections = connections[node.name];
      if (nodeConnections && nodeConnections.main) {
        const outputCount = nodeConnections.main.length;

        if (node.type === 'n8n-nodes-base.if' && outputCount < 2) {
          errors.push({
            node_id: node.id,
            node_name: node.name,
            error: `IF node "${node.name}" has only ${outputCount} output(s), expected 2`,
            data: 'IF nodes require 2 outputs (true/false branches)',
          });
        }

        if (node.type === 'n8n-nodes-base.switch') {
          const rules = node.parameters?.rules as any;
          const expectedOutputs = rules?.values?.length ? rules.values.length + 1 : 2;

          if (outputCount < expectedOutputs) {
            warnings.push(
              `Switch node "${node.name}" has ${outputCount} outputs but ${expectedOutputs} expected based on rules count`
            );
          }
        }
      }
    }
  });
}
