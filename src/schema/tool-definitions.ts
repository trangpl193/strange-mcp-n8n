/**
 * Canonical Tool Definitions for MCP N8N
 *
 * These definitions are API-agnostic and will be transformed
 * by the schema adapter based on target API detection.
 */

import type { CanonicalToolDefinition } from '@strange/mcp-core';

/**
 * workflow_list - List workflows with filtering
 */
export const workflowListTool: CanonicalToolDefinition = {
  name: 'workflow_list',
  description: 'List N8N workflows with filtering. Returns workflow summaries with metadata.',
  parameters: [
    {
      name: 'active',
      schema: { type: 'boolean', description: 'Filter by active status', optional: true },
    },
    {
      name: 'tags',
      schema: { type: 'string', description: 'Filter by tags (comma-separated)', optional: true },
    },
    {
      name: 'name',
      schema: { type: 'string', description: 'Filter by workflow name (partial match)', optional: true },
    },
    {
      name: 'limit',
      schema: { type: 'number', description: 'Maximum number of workflows to return', optional: true },
    },
    {
      name: 'cursor',
      schema: { type: 'string', description: 'Pagination cursor', optional: true },
    },
  ],
};

/**
 * workflow_get - Get workflow by ID
 */
export const workflowGetTool: CanonicalToolDefinition = {
  name: 'workflow_get',
  description: 'Get detailed information about a specific N8N workflow by ID.',
  parameters: [
    {
      name: 'workflowId',
      schema: { type: 'string', description: 'Workflow ID' },
      required: true,
    },
  ],
};

/**
 * workflow_create - Create new workflow
 */
export const workflowCreateTool: CanonicalToolDefinition = {
  name: 'workflow_create',
  description: 'Create a new N8N workflow from simplified schema. Returns created workflow with ID.',
  parameters: [
    {
      name: 'name',
      schema: { type: 'string', description: 'Workflow name' },
      required: true,
    },
    {
      name: 'steps',
      schema: {
        type: 'array',
        description: 'Workflow steps',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Node type: webhook, schedule, manual, http, postgres, discord, code, if, switch, merge, set, respond' },
            action: { type: 'string', description: 'Action for nodes with multiple operations', optional: true },
            config: {
              type: 'object',
              description: 'Type-specific configuration',
              properties: {},
              additionalProperties: true,
            },
          },
          required: ['type'],
        },
      },
      required: true,
    },
    {
      name: 'active',
      schema: { type: 'boolean', description: 'Set workflow as active after creation', optional: true },
    },
    {
      name: 'tags',
      schema: {
        type: 'array',
        description: 'Workflow tags',
        items: { type: 'string' },
        optional: true,
      },
    },
    {
      name: 'credentials',
      schema: {
        type: 'object',
        description: 'Credential mapping (name → ID)',
        properties: {},
        additionalProperties: true,
        optional: true,
      },
    },
  ],
};

/**
 * workflow_update - Update existing workflow
 */
export const workflowUpdateTool: CanonicalToolDefinition = {
  name: 'workflow_update',
  description: 'Update an existing N8N workflow. Supports simplified schema replacement, direct N8N JSON, or quick operations.',
  parameters: [
    {
      name: 'workflowId',
      schema: { type: 'string', description: 'Workflow ID to update' },
      required: true,
    },
    {
      name: 'name',
      schema: { type: 'string', description: 'New workflow name', optional: true },
    },
    {
      name: 'steps',
      schema: {
        type: 'array',
        description: 'Workflow steps (simplified schema)',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            action: { type: 'string', optional: true },
            config: { type: 'object', properties: {}, additionalProperties: true },
          },
          required: ['type'],
        },
        optional: true,
      },
    },
    {
      name: 'nodes',
      schema: {
        type: 'array',
        description: 'N8N nodes (direct JSON update)',
        items: { type: 'object', properties: {}, additionalProperties: true },
        optional: true,
      },
    },
    {
      name: 'connections',
      schema: {
        type: 'object',
        description: 'N8N connections (direct JSON update)',
        properties: {},
        additionalProperties: true,
        optional: true,
      },
    },
    {
      name: 'credentials',
      schema: {
        type: 'object',
        description: 'Credential mapping',
        properties: {},
        additionalProperties: true,
        optional: true,
      },
    },
    {
      name: 'active',
      schema: { type: 'boolean', description: 'Set active status', optional: true },
    },
    {
      name: 'rename',
      schema: { type: 'string', description: 'Rename workflow (quick operation)', optional: true },
    },
    {
      name: 'addTags',
      schema: {
        type: 'array',
        description: 'Add tags to workflow',
        items: { type: 'string' },
        optional: true,
      },
    },
    {
      name: 'removeTags',
      schema: {
        type: 'array',
        description: 'Remove tags from workflow',
        items: { type: 'string' },
        optional: true,
      },
    },
  ],
};

/**
 * execution_list - List workflow executions
 */
export const executionListTool: CanonicalToolDefinition = {
  name: 'execution_list',
  description: 'List N8N workflow executions with filtering. Returns execution summaries.',
  parameters: [
    {
      name: 'workflowId',
      schema: { type: 'string', description: 'Filter by workflow ID', optional: true },
    },
    {
      name: 'status',
      schema: {
        type: 'enum',
        description: 'Filter by status',
        values: ['success', 'error', 'running', 'waiting'],
        optional: true,
      },
    },
    {
      name: 'limit',
      schema: { type: 'number', description: 'Maximum number of executions to return', optional: true },
    },
  ],
};

/**
 * execution_debug - Get execution debug info
 */
export const executionDebugTool: CanonicalToolDefinition = {
  name: 'execution_debug',
  description: 'Get detailed debug information for a workflow execution, including node-level data.',
  parameters: [
    {
      name: 'executionId',
      schema: { type: 'string', description: 'Execution ID' },
      required: true,
    },
  ],
};

/**
 * node_get - Get single node from workflow
 */
export const nodeGetTool: CanonicalToolDefinition = {
  name: 'node_get',
  description: 'Get a single node from a workflow. Use this to view node configuration before updating.',
  parameters: [
    {
      name: 'workflowId',
      schema: { type: 'string', description: 'Workflow ID' },
      required: true,
    },
    {
      name: 'nodeIdentifier',
      schema: { type: 'string', description: 'Node name or ID' },
      required: true,
    },
  ],
};

/**
 * node_update - Update single node
 */
export const nodeUpdateTool: CanonicalToolDefinition = {
  name: 'node_update',
  description: 'Update a single node in a workflow. Parameters are MERGED with existing (use null to remove).',
  parameters: [
    {
      name: 'workflowId',
      schema: { type: 'string', description: 'Workflow ID' },
      required: true,
    },
    {
      name: 'nodeIdentifier',
      schema: { type: 'string', description: 'Node name or ID to update' },
      required: true,
    },
    {
      name: 'name',
      schema: { type: 'string', description: 'New name for the node', optional: true },
    },
    {
      name: 'parameters',
      schema: {
        type: 'object',
        description: 'Parameters to update (merged with existing)',
        properties: {},
        additionalProperties: true,
        optional: true,
      },
    },
    {
      name: 'position',
      schema: {
        type: 'tuple',
        description: 'New position [x, y]',
        items: [{ type: 'number' }, { type: 'number' }],
        optional: true,
      },
    },
    {
      name: 'disabled',
      schema: { type: 'boolean', description: 'Enable/disable the node', optional: true },
    },
  ],
};

/**
 * builder_list - List pending builder sessions
 */
export const builderListTool: CanonicalToolDefinition = {
  name: 'builder_list',
  description: 'List pending builder sessions. Use this to discover drafts from previous sessions.',
  parameters: [
    {
      name: 'includeExpired',
      schema: { type: 'boolean', description: 'Include recently expired sessions', optional: true },
    },
  ],
};

/**
 * builder_start - Start new builder session
 */
export const builderStartTool: CanonicalToolDefinition = {
  name: 'builder_start',
  description: 'Start a new workflow builder session. Creates a draft that can be built step-by-step.',
  parameters: [
    {
      name: 'name',
      schema: { type: 'string', description: 'Workflow name' },
      required: true,
    },
    {
      name: 'description',
      schema: { type: 'string', description: 'Workflow description', optional: true },
    },
    {
      name: 'credentials',
      schema: {
        type: 'object',
        description: 'Credential mapping (name → ID)',
        properties: {},
        additionalProperties: true,
        optional: true,
      },
    },
  ],
};

/**
 * builder_add_node - Add node to builder draft
 */
export const builderAddNodeTool: CanonicalToolDefinition = {
  name: 'builder_add_node',
  description: 'Add a node to the builder draft. Supports simplified node types.',
  parameters: [
    {
      name: 'sessionId',
      schema: { type: 'string', description: 'Builder session ID' },
      required: true,
    },
    {
      name: 'node',
      schema: {
        type: 'object',
        description: 'Node definition',
        properties: {
          type: { type: 'string', description: 'Node type: webhook, schedule, manual, http, postgres, discord, code, if, switch, merge, set, respond' },
          name: { type: 'string', description: 'Node name (auto-generated if omitted)', optional: true },
          action: { type: 'string', description: 'Action for nodes with multiple operations', optional: true },
          config: { type: 'object', description: 'Type-specific configuration', properties: {}, additionalProperties: true },
          credential: { type: 'string', description: 'Credential name', optional: true },
          position: {
            type: 'tuple',
            description: 'Position [x, y]',
            items: [{ type: 'number' }, { type: 'number' }],
            optional: true,
          },
        },
        required: ['type'],
      },
      required: true,
    },
  ],
};

/**
 * builder_connect - Connect nodes in builder draft
 */
export const builderConnectTool: CanonicalToolDefinition = {
  name: 'builder_connect',
  description: 'Connect two nodes in the builder draft.',
  parameters: [
    {
      name: 'sessionId',
      schema: { type: 'string', description: 'Builder session ID' },
      required: true,
    },
    {
      name: 'fromNode',
      schema: { type: 'string', description: 'Source node name or ID' },
      required: true,
    },
    {
      name: 'toNode',
      schema: { type: 'string', description: 'Target node name or ID' },
      required: true,
    },
    {
      name: 'fromOutput',
      schema: { type: 'number', description: 'Source output index (default: 0)', optional: true },
    },
    {
      name: 'toInput',
      schema: { type: 'number', description: 'Target input index (default: 0)', optional: true },
    },
  ],
};

/**
 * builder_commit - Commit builder draft to N8N
 */
export const builderCommitTool: CanonicalToolDefinition = {
  name: 'builder_commit',
  description: 'Commit the builder draft to N8N. Creates the workflow and closes the session.',
  parameters: [
    {
      name: 'sessionId',
      schema: { type: 'string', description: 'Builder session ID' },
      required: true,
    },
    {
      name: 'activate',
      schema: { type: 'boolean', description: 'Activate workflow after creation (default: false)', optional: true },
    },
  ],
};

/**
 * builder_discard - Discard builder session
 */
export const builderDiscardTool: CanonicalToolDefinition = {
  name: 'builder_discard',
  description: 'Discard a builder session without committing. Cleans up the draft.',
  parameters: [
    {
      name: 'sessionId',
      schema: { type: 'string', description: 'Builder session ID' },
      required: true,
    },
  ],
};

/**
 * All tool definitions
 */
export const allTools: CanonicalToolDefinition[] = [
  workflowListTool,
  workflowGetTool,
  workflowCreateTool,
  workflowUpdateTool,
  executionListTool,
  executionDebugTool,
  nodeGetTool,
  nodeUpdateTool,
  builderListTool,
  builderStartTool,
  builderAddNodeTool,
  builderConnectTool,
  builderCommitTool,
  builderDiscardTool,
];
