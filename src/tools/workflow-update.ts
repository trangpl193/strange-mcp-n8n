import { ExecutionMetadata, McpError, McpErrorCode } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import { WorkflowTransformer } from '../services/workflow-transformer.js';
import type { SimplifiedWorkflow } from '../schemas/simplified-workflow.js';
import type { N8NWorkflow } from '../types.js';

export interface WorkflowUpdateInput {
  workflow_id: string;

  // Option 1: Full replacement with simplified schema
  workflow?: SimplifiedWorkflow;
  credentials?: Record<string, string>;

  // Option 2: Direct N8N JSON update (advanced)
  workflow_json?: Partial<N8NWorkflow>;

  // Option 3: Quick operations
  activate?: boolean;
  rename?: string;
  add_tags?: string[];
  remove_tags?: string[];
}

export interface WorkflowUpdateOutput {
  workflow_id: string;
  name: string;
  active: boolean;
  nodes_count: number;
  updated_at: string;
  meta: ExecutionMetadata;
}

/**
 * Update existing N8N workflow
 *
 * Note: N8N API requires full workflow payload for updates (no PATCH).
 * This tool provides multiple update strategies:
 *
 * 1. Full replacement with simplified schema (workflow + credentials)
 * 2. Direct N8N JSON update (workflow_json)
 * 3. Quick operations (activate, rename, add_tags)
 */
export async function workflowUpdate(
  client: N8NClient,
  input: WorkflowUpdateInput
): Promise<WorkflowUpdateOutput> {
  const startTime = Date.now();

  // Fetch current workflow
  const currentWorkflow = await client.getWorkflow(input.workflow_id);

  let updatedWorkflow: Partial<N8NWorkflow>;

  // Strategy 1: Full replacement with simplified schema
  if (input.workflow) {
    // Build credential map
    const credentialMap = new Map<string, string>();
    if (input.credentials) {
      Object.entries(input.credentials).forEach(([name, id]) => {
        credentialMap.set(name, id);
      });
    }

    // Transform simplified workflow to N8N format
    const transformer = new WorkflowTransformer(credentialMap);
    const transformedWorkflow = transformer.transform(input.workflow);

    updatedWorkflow = {
      name: transformedWorkflow.name!,
      nodes: transformedWorkflow.nodes!,
      connections: transformedWorkflow.connections!,
      active: transformedWorkflow.active ?? currentWorkflow.active,
      settings: transformedWorkflow.settings || currentWorkflow.settings,
      tags: currentWorkflow.tags, // Preserve tags
    };
  }
  // Strategy 2: Direct N8N JSON update
  else if (input.workflow_json) {
    updatedWorkflow = {
      ...currentWorkflow,
      ...input.workflow_json,
    };
  }
  // Strategy 3: Quick operations
  else {
    updatedWorkflow = {
      name: currentWorkflow.name,
      nodes: currentWorkflow.nodes,
      connections: currentWorkflow.connections,
      active: currentWorkflow.active,
      settings: currentWorkflow.settings,
      tags: currentWorkflow.tags || [],
    };

    // Apply quick operations
    if (input.activate !== undefined) {
      updatedWorkflow.active = input.activate;
    }

    if (input.rename) {
      updatedWorkflow.name = input.rename;
    }

    if (input.add_tags && Array.isArray(updatedWorkflow.tags)) {
      updatedWorkflow.tags = [
        ...new Set([...updatedWorkflow.tags, ...input.add_tags]),
      ];
    }

    if (input.remove_tags && Array.isArray(updatedWorkflow.tags)) {
      updatedWorkflow.tags = updatedWorkflow.tags.filter(
        (tag) => !input.remove_tags!.includes(tag)
      );
    }
  }

  // Validate that required fields are present
  if (!updatedWorkflow.name || !updatedWorkflow.nodes || !updatedWorkflow.connections) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      'Workflow update must include name, nodes, and connections',
      {
        details: {
          hint: 'N8N API requires full workflow payload. Provide workflow, workflow_json, or use quick operations.',
        },
      }
    );
  }

  // Update workflow via N8N API
  const response: N8NWorkflow = await client.updateWorkflow(
    input.workflow_id,
    updatedWorkflow
  );

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    workflow_id: response.id,
    name: response.name,
    active: response.active,
    nodes_count: response.nodes.length,
    updated_at: response.updatedAt,
    meta,
  };
}
