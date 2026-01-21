import { ExecutionMetadata, McpError, McpErrorCode, createMetadataFromStart } from '@strange/mcp-core';
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
  let desiredActive: boolean | undefined; // Track activation state separately

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

    // Note: N8N API treats 'active' as read-only on PUT, so we omit it
    updatedWorkflow = {
      name: transformedWorkflow.name!,
      nodes: transformedWorkflow.nodes!,
      connections: transformedWorkflow.connections!,
      settings: transformedWorkflow.settings || currentWorkflow.settings,
      // Note: tags is read-only on N8N PUT API, omit from payload
    };
    // Track desired active state from transformed workflow
    desiredActive = transformedWorkflow.active;
  }
  // Strategy 2: Direct N8N JSON update
  else if (input.workflow_json) {
    // Extract and remove 'active' and 'tags' from workflow_json to handle separately
    const { active: jsonActive, tags: _jsonTags, ...jsonWithoutReadOnly } = input.workflow_json;
    desiredActive = jsonActive;

    updatedWorkflow = {
      ...currentWorkflow,
      ...jsonWithoutReadOnly,
    };
    // Remove read-only fields from the payload
    delete updatedWorkflow.active;
    delete updatedWorkflow.tags;
  }
  // Strategy 3: Quick operations
  else {
    updatedWorkflow = {
      name: currentWorkflow.name,
      nodes: currentWorkflow.nodes,
      connections: currentWorkflow.connections,
      settings: currentWorkflow.settings,
      // Note: tags is read-only on N8N PUT API, handled via separate endpoints
    };

    // Track activation request separately
    if (input.activate !== undefined) {
      desiredActive = input.activate;
    }

    if (input.rename) {
      updatedWorkflow.name = input.rename;
    }

    // Note: add_tags and remove_tags would need separate API calls to N8N tag endpoints
    // For now, these are no-ops since tags can't be updated via PUT
    if (input.add_tags || input.remove_tags) {
      console.warn('Tag modifications via workflow_update not yet implemented - tags require separate N8N API calls');
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

  // Update workflow via N8N API (without 'active' field)
  const response: N8NWorkflow = await client.updateWorkflow(
    input.workflow_id,
    updatedWorkflow
  );

  // Handle activation state separately if requested
  let finalActive = response.active;
  if (desiredActive !== undefined && desiredActive !== currentWorkflow.active) {
    try {
      if (desiredActive) {
        await client.activateWorkflow(input.workflow_id);
        finalActive = true;
      } else {
        await client.deactivateWorkflow(input.workflow_id);
        finalActive = false;
      }
    } catch (activateError) {
      // Update succeeded but activation change failed
      console.warn(`Workflow updated but activation change failed: ${activateError}`);
    }
  }

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    workflow_id: response.id,
    name: response.name,
    active: finalActive,
    nodes_count: response.nodes.length,
    updated_at: response.updatedAt,
    meta,
  };
}
