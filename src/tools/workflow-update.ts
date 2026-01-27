import { ExecutionMetadata, McpError, McpErrorCode, createMetadataFromStart } from '@trangpl193/mcp-core';
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
 * Pre-flight validation: Detect and validate update strategy before expensive operations
 * This prevents token waste from transformations that will fail validation
 */
function validateUpdateStrategy(input: WorkflowUpdateInput): void {
  const hasWorkflow = !!input.workflow;
  const hasWorkflowJson = !!input.workflow_json;
  const hasQuickOps = !!(
    input.activate !== undefined ||
    input.rename ||
    input.add_tags?.length ||
    input.remove_tags?.length
  );

  const strategyCount = [hasWorkflow, hasWorkflowJson, hasQuickOps].filter(Boolean).length;

  // Error: No strategy provided
  if (strategyCount === 0) {
    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      'workflow_update requires at least one update operation',
      {
        details: {
          hint: 'Choose ONE strategy and provide required parameters',
          decision_tree: [
            'JUST metadata (name, active, tags)? → Use quick ops: { rename: "...", activate: true }',
            'ANY nodes (add, remove, modify)? → Use builder pattern instead (builder_start → add_node → commit)',
            'Have complete validated JSON? → Use workflow_json (expert mode)',
          ],
          examples: {
            quick_ops: { workflow_id: 'abc', rename: 'New Name', activate: true },
            full_replacement: 'Use builder pattern for node changes, not workflow_update',
          },
        },
      }
    );
  }

  // Error: Multiple strategies mixed
  if (strategyCount > 1) {
    const providedStrategies = [];
    if (hasWorkflow) providedStrategies.push('workflow');
    if (hasWorkflowJson) providedStrategies.push('workflow_json');
    if (hasQuickOps) providedStrategies.push('quick operations');

    throw new McpError(
      McpErrorCode.INVALID_PARAMS,
      `Cannot mix update strategies. Provided: ${providedStrategies.join(', ')}`,
      {
        details: {
          hint: 'Choose ONLY ONE strategy per call',
          provided_parameters: {
            workflow: hasWorkflow,
            workflow_json: hasWorkflowJson,
            quick_ops: hasQuickOps,
          },
        },
      }
    );
  }

  // Strategy-specific validation
  if (hasWorkflow) {
    if (!input.workflow.name) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        'workflow.name is required when using simplified schema strategy',
        {
          details: {
            hint: 'Provide workflow.name in your simplified workflow definition',
          },
        }
      );
    }
    if (!input.workflow.steps || input.workflow.steps.length === 0) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        'workflow.steps cannot be empty when using simplified schema strategy',
        {
          details: {
            hint: 'Provide at least one step in workflow.steps array',
          },
        }
      );
    }
  }

  if (hasWorkflowJson) {
    // Basic validation for workflow_json strategy
    if (input.workflow_json.name === '') {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        'workflow_json.name cannot be empty string',
        {
          details: {
            hint: 'Either provide a valid name or omit the field to keep existing name',
          },
        }
      );
    }
  }
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

  // Pre-flight validation: Check strategy before expensive operations
  validateUpdateStrategy(input);

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
