/**
 * MCP N8N Server using @strange/mcp-core transport
 *
 * Migrated to use standardized transport layer from mcp-core v1.2.0.
 * Eliminates ~100 lines of transport boilerplate code.
 *
 * Original: 2026-01-20 (direct SDK usage)
 * Refactored: 2026-01-23 (mcp-core factory pattern)
 * See: /home/strange/.claude/briefs/mcp-platform-dependencies-2026-01-23.md
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createStreamableHttpServer } from '@strange/mcp-core';
import { N8NClient } from './services/index.js';
import { initSessionStore, getSessionStoreType } from './services/session-store-factory.js';
import { initializeSchemas, detectAPI } from './schema/index.js';
import {
  workflowList,
  workflowCreate,
  workflowGet,
  workflowUpdate,
  executionList,
  executionDebug,
  nodeGet,
  nodeUpdate,
  // Builder Pattern (Phase 2A)
  builderStart,
  builderAddNode,
  builderConnect,
  builderCommit,
  builderDiscard,
  builderList,
} from './tools/index.js';

// Knowledge Layer (Phase 3A)
import {
  handleSchemaGet,
  handleSchemaList,
  handleQuirksCheck,
  handleQuirksSearch,
  handleSchemaValidate,
} from './knowledge/mcp-tool-handlers.js';

// Configuration interface
export interface N8NMcpServerConfig {
  n8nUrl: string;
  apiKey: string;
  mcpApiKey: string;
  timeout?: number;
  httpPort?: number;
  httpHost?: string;
  sessionTimeout?: number;
  cleanupInterval?: number;
}

/**
 * Create MCP server with all N8N tools
 */
function createMcpServer(client: N8NClient): McpServer {
  const server = new McpServer({
    name: 'strange-mcp-n8n',
    version: '1.2.0',
  });

  // Tool: workflow_list
  server.registerTool(
    'workflow_list',
    {
      description: 'List N8N workflows with filtering. Returns workflow summaries with metadata.',
      inputSchema: {
        active: z.boolean().optional().describe('Filter by active status'),
        tags: z.string().optional().describe('Filter by tags (comma-separated)'),
        name: z.string().optional().describe('Filter by workflow name (partial match)'),
        limit: z.number().optional().describe('Maximum number of workflows to return'),
        cursor: z.string().optional().describe('Pagination cursor'),
      },
    },
    async (args: { active?: boolean; tags?: string; name?: string; limit?: number; cursor?: string }) => {
      const result = await workflowList(client, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: workflow_get
  server.registerTool(
    'workflow_get',
    {
      description: 'Get detailed information about a specific N8N workflow by ID.',
      inputSchema: {
        workflowId: z.string().describe('Workflow ID'),
      },
    },
    async (args: { workflowId: string }) => {
      // Adapter: Map MCP schema to implementation interface
      const input = { workflow_id: args.workflowId };
      const result = await workflowGet(client, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: workflow_create
  // Schema: Gemini-compatible (flattened to primitives + JSON strings)
  server.registerTool(
    'workflow_create',
    {
      description: 'Create a new N8N workflow from simplified schema. Returns created workflow with ID.',
      inputSchema: {
        name: z.string().describe('Workflow name'),
        steps_json: z.string().describe(
          'JSON array of workflow steps. Example: [{"type":"webhook","config":{"path":"/hook"}},{"type":"postgres","action":"query","config":{"query":"SELECT 1"}}]'
        ),
        active: z.boolean().optional().describe('Set workflow as active after creation'),
        tags_csv: z.string().optional().describe(
          'Comma-separated list of tags. Example: "backup,daily,production"'
        ),
        credentials_json: z.string().optional().describe(
          'JSON object mapping credential names to IDs. Example: {"postgres":"cred-abc123"}'
        ),
      },
    },
    async (args, _extra) => {
      // Parse JSON/CSV strings to structured data
      let steps: any[];
      let tags: string[] | undefined;
      let credentials: Record<string, string> | undefined;

      try {
        steps = JSON.parse(args.steps_json as string);
      } catch (e) {
        throw new Error(`workflow_create failed: Invalid steps_json - must be valid JSON array. Error: ${e}`);
      }

      if (args.tags_csv) {
        tags = (args.tags_csv as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      }

      if (args.credentials_json) {
        try {
          credentials = JSON.parse(args.credentials_json as string);
        } catch (e) {
          throw new Error(`workflow_create failed: Invalid credentials_json - must be valid JSON object. Error: ${e}`);
        }
      }

      // Adapter: Map parsed data to nested WorkflowCreateInput
      const input = {
        workflow: {
          name: args.name as string,
          steps,
        },
        credentials,
        activate: args.active as boolean | undefined,
      };

      try {
        const result = await workflowCreate(client, input);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const hint = `Check that 'steps_json' contains valid step objects with 'type' property. ` +
                     `Supported types: webhook, schedule, manual, http, postgres, discord, respond, if, switch, merge, set, code`;
        throw new Error(`workflow_create failed: ${errorMessage}\n\nHint: ${hint}`);
      }
    }
  );

  // Tool: workflow_update
  // Schema: Gemini-compatible (flattened to primitives + JSON strings)
  server.registerTool(
    'workflow_update',
    {
      description: 'Update an existing N8N workflow. Supports 3 strategies: (1) simplified schema replacement, (2) direct N8N JSON, (3) quick operations (activate, rename, tags).',
      inputSchema: {
        workflowId: z.string().describe('Workflow ID to update'),
        // Strategy 1: Simplified schema replacement
        name: z.string().optional().describe('New workflow name'),
        steps_json: z.string().optional().describe(
          'JSON array of workflow steps (simplified schema). Example: [{"type":"postgres","action":"query","config":{}}]'
        ),
        credentials_json: z.string().optional().describe(
          'JSON object mapping credential names to IDs. Example: {"postgres":"cred-abc123"}'
        ),
        // Strategy 2: Direct N8N JSON
        nodes_json: z.string().optional().describe(
          'JSON array of N8N nodes (direct JSON update). Full N8N node format.'
        ),
        connections_json: z.string().optional().describe(
          'JSON object of N8N connections (direct JSON update). Full N8N connections format.'
        ),
        // Strategy 3: Quick operations
        active: z.boolean().optional().describe('Set active status'),
        rename: z.string().optional().describe('Rename workflow (quick operation)'),
        tags_csv: z.string().optional().describe('Set workflow tags (comma-separated)'),
        addTags_csv: z.string().optional().describe('Add tags to workflow (comma-separated)'),
        removeTags_csv: z.string().optional().describe('Remove tags from workflow (comma-separated)'),
      },
    },
    async (args, _extra) => {
      // Parse JSON/CSV strings to structured data
      let steps: any[] | undefined;
      let nodes: any[] | undefined;
      let connections: any | undefined;
      let credentials: Record<string, string> | undefined;
      let addTags: string[] | undefined;
      let removeTags: string[] | undefined;

      // Parse steps_json
      if (args.steps_json) {
        try {
          steps = JSON.parse(args.steps_json as string);
        } catch (e) {
          throw new Error(`workflow_update failed: Invalid steps_json - must be valid JSON array. Error: ${e}`);
        }
      }

      // Parse nodes_json
      if (args.nodes_json) {
        try {
          nodes = JSON.parse(args.nodes_json as string);
        } catch (e) {
          throw new Error(`workflow_update failed: Invalid nodes_json - must be valid JSON array. Error: ${e}`);
        }
      }

      // Parse connections_json
      if (args.connections_json) {
        try {
          connections = JSON.parse(args.connections_json as string);
        } catch (e) {
          throw new Error(`workflow_update failed: Invalid connections_json - must be valid JSON object. Error: ${e}`);
        }
      }

      // Parse credentials_json
      if (args.credentials_json) {
        try {
          credentials = JSON.parse(args.credentials_json as string);
        } catch (e) {
          throw new Error(`workflow_update failed: Invalid credentials_json - must be valid JSON object. Error: ${e}`);
        }
      }

      // Parse CSV tags
      if (args.addTags_csv) {
        addTags = (args.addTags_csv as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      }
      if (args.removeTags_csv) {
        removeTags = (args.removeTags_csv as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
      }

      // Adapter: Map parsed data to WorkflowUpdateInput with proper strategy detection
      const input: any = {
        workflow_id: args.workflowId as string,
      };

      // Strategy 1: Simplified schema (if steps provided)
      if (steps) {
        input.workflow = {
          name: (args.name as string) || '',
          steps,
        };
        input.credentials = credentials;
      }
      // Strategy 2: Direct N8N JSON (if nodes provided)
      else if (nodes) {
        input.workflow_json = {
          name: args.name as string | undefined,
          nodes,
          connections,
          active: args.active as boolean | undefined,
        };
      }
      // Strategy 3: Quick operations
      else {
        if (args.active !== undefined) input.activate = args.active;
        if (args.rename) input.rename = args.rename;
        if (addTags) input.add_tags = addTags;
        if (removeTags) input.remove_tags = removeTags;
      }

      try {
        const result = await workflowUpdate(client, input);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const hint = `Update strategies: (1) provide 'steps_json' for simplified schema, ` +
                     `(2) provide 'nodes_json'+'connections_json' for direct N8N JSON, ` +
                     `(3) use 'active', 'rename', 'addTags_csv', 'removeTags_csv' for quick operations.`;
        throw new Error(`workflow_update failed: ${errorMessage}\n\nHint: ${hint}`);
      }
    }
  );

  // Tool: execution_list
  server.registerTool(
    'execution_list',
    {
      description: 'List N8N workflow executions with filtering. Returns execution summaries.',
      inputSchema: {
        workflowId: z.string().optional().describe('Filter by workflow ID'),
        status: z.enum(['success', 'error', 'running', 'waiting']).optional().describe('Filter by status'),
        limit: z.number().optional().describe('Maximum number of executions to return'),
      },
    },
    async (args, _extra) => {
      // Adapter: Map camelCase to snake_case
      const input = {
        workflow_id: args.workflowId as string | undefined,
        status: args.status as 'success' | 'error' | 'running' | 'waiting' | undefined,
        limit: args.limit as number | undefined,
      };
      const result = await executionList(client, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: execution_debug
  server.registerTool(
    'execution_debug',
    {
      description: 'Get detailed debug information for a workflow execution, including node-level data.',
      inputSchema: {
        executionId: z.string().describe('Execution ID'),
      },
    },
    async (args, _extra) => {
      // Adapter: Map camelCase to snake_case
      const input = { execution_id: args.executionId as string };
      const result = await executionDebug(client, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ========================================
  // Node-level operations (Workflow Builder Enhancement)
  // ========================================

  // Tool: node_get
  server.registerTool(
    'node_get',
    {
      description: 'Get a single node from a workflow. Use this to view node configuration before updating.',
      inputSchema: {
        workflowId: z.string().describe('Workflow ID'),
        nodeIdentifier: z.string().describe('Node name or ID'),
      },
    },
    async (args, _extra) => {
      const input = {
        workflow_id: args.workflowId as string,
        node_identifier: args.nodeIdentifier as string,
      };
      const result = await nodeGet(client, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: node_update
  // Schema: Gemini-compatible (flattened position and parameters)
  server.registerTool(
    'node_update',
    {
      description: 'Update a single node in a workflow. Handles full workflow fetch, node modification, and PUT automatically. Parameters are MERGED with existing (use null to remove).',
      inputSchema: {
        workflowId: z.string().describe('Workflow ID'),
        nodeIdentifier: z.string().describe('Node name or ID to update'),
        name: z.string().optional().describe('New name for the node (also updates connections)'),
        parameters_json: z.string().optional().describe(
          'JSON object of parameters to update (merged with existing). Example: {"query":"SELECT * FROM users"}'
        ),
        positionX: z.number().optional().describe('New X position'),
        positionY: z.number().optional().describe('New Y position'),
        disabled: z.boolean().optional().describe('Enable/disable the node'),
      },
    },
    async (args, _extra) => {
      // Parse JSON strings
      let parameters: Record<string, unknown> | undefined;
      let position: [number, number] | undefined;

      if (args.parameters_json) {
        try {
          parameters = JSON.parse(args.parameters_json as string);
        } catch (e) {
          throw new Error(`node_update failed: Invalid parameters_json - must be valid JSON object. Error: ${e}`);
        }
      }

      if (args.positionX !== undefined && args.positionY !== undefined) {
        position = [args.positionX as number, args.positionY as number];
      }

      const input = {
        workflow_id: args.workflowId as string,
        node_identifier: args.nodeIdentifier as string,
        name: args.name as string | undefined,
        parameters,
        position,
        disabled: args.disabled as boolean | undefined,
      };
      const result = await nodeUpdate(client, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ========================================
  // Builder Pattern Tools (Phase 2A: Stateful Workflow Builder)
  // ========================================

  // Tool: builder_list (Discovery - solves Blind Box Problem)
  server.registerTool(
    'builder_list',
    {
      description: 'List pending builder sessions. Use this to discover drafts from previous sessions (solves Blind Box Problem). Call this first when user mentions "continue" or "resume".',
      inputSchema: {
        includeExpired: z.boolean().optional().describe('Include recently expired sessions (default: true)'),
      },
    },
    async (args, _extra) => {
      const input = {
        include_expired: args.includeExpired as boolean | undefined,
      };
      const result = await builderList(input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: builder_start
  // Schema: Gemini-compatible (flattened credentials)
  server.registerTool(
    'builder_start',
    {
      description: 'Start a new workflow builder session. Creates a draft that can be built step-by-step.',
      inputSchema: {
        name: z.string().describe('Workflow name'),
        description: z.string().optional().describe('Workflow description'),
        credentials_json: z.string().optional().describe(
          'JSON object mapping credential names to IDs. Example: {"postgres":"cred-abc123","discord":"cred-xyz789"}'
        ),
      },
    },
    async (args, _extra) => {
      // Parse JSON strings
      let credentials: Record<string, string> | undefined;

      if (args.credentials_json) {
        try {
          credentials = JSON.parse(args.credentials_json as string);
        } catch (e) {
          throw new Error(`builder_start failed: Invalid credentials_json - must be valid JSON object. Error: ${e}`);
        }
      }

      const input = {
        name: args.name as string,
        description: args.description as string | undefined,
        credentials,
      };
      const result = await builderStart(input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: builder_add_node
  // Schema: Gemini-compatible (flattened node object to individual fields)
  server.registerTool(
    'builder_add_node',
    {
      description: 'Add a node to the builder draft. Supports simplified node types.',
      inputSchema: {
        sessionId: z.string().describe('Builder session ID'),
        nodeType: z.string().describe('Node type: webhook, schedule, manual, http, postgres, discord, code, if, switch, merge, set, respond'),
        nodeName: z.string().optional().describe('Node name (auto-generated if omitted)'),
        nodeAction: z.string().optional().describe('Action for nodes with multiple operations (e.g., "query", "insert")'),
        nodeConfig_json: z.string().optional().describe(
          'JSON object with type-specific configuration. Example: {"query":"SELECT 1","operation":"executeQuery"}'
        ),
        credentialName: z.string().optional().describe('Credential name (must be in session credentials map)'),
        positionX: z.number().optional().describe('Node X position (auto-calculated if omitted)'),
        positionY: z.number().optional().describe('Node Y position (auto-calculated if omitted)'),
      },
    },
    async (args, _extra) => {
      // Parse JSON strings and build node object
      let config: Record<string, any> | undefined;
      let position: [number, number] | undefined;

      if (args.nodeConfig_json) {
        try {
          config = JSON.parse(args.nodeConfig_json as string);
        } catch (e) {
          throw new Error(`builder_add_node failed: Invalid nodeConfig_json - must be valid JSON object. Error: ${e}`);
        }
      }

      if (args.positionX !== undefined && args.positionY !== undefined) {
        position = [args.positionX as number, args.positionY as number];
      }

      // Reconstruct the node object expected by the handler
      const node: any = {
        type: args.nodeType as string,
      };
      if (args.nodeName) node.name = args.nodeName;
      if (args.nodeAction) node.action = args.nodeAction;
      if (config) node.config = config;
      if (args.credentialName) node.credential = args.credentialName;
      if (position) node.position = position;

      const input = {
        session_id: args.sessionId as string,
        node,
      };
      const result = await builderAddNode(input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: builder_connect
  server.registerTool(
    'builder_connect',
    {
      description: 'Connect two nodes in the builder draft.',
      inputSchema: {
        sessionId: z.string().describe('Builder session ID'),
        fromNode: z.string().describe('Source node name or ID'),
        toNode: z.string().describe('Target node name or ID'),
        fromOutput: z.number().optional().describe('Source output index (default: 0)'),
        toInput: z.number().optional().describe('Target input index (default: 0)'),
      },
    },
    async (args, _extra) => {
      const input = {
        session_id: args.sessionId as string,
        from_node: args.fromNode as string,
        to_node: args.toNode as string,
        from_output: args.fromOutput as number | undefined,
        to_input: args.toInput as number | undefined,
      };
      const result = await builderConnect(input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: builder_commit
  server.registerTool(
    'builder_commit',
    {
      description: 'Commit the builder draft to N8N. Creates the workflow and closes the session.',
      inputSchema: {
        sessionId: z.string().describe('Builder session ID'),
        activate: z.boolean().optional().describe('Activate workflow after creation (default: false)'),
      },
    },
    async (args, _extra) => {
      const input = {
        session_id: args.sessionId as string,
        activate: args.activate as boolean | undefined,
      };
      const result = await builderCommit(client, input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: builder_discard
  server.registerTool(
    'builder_discard',
    {
      description: 'Discard a builder session without committing. Cleans up the draft.',
      inputSchema: {
        sessionId: z.string().describe('Builder session ID'),
      },
    },
    async (args, _extra) => {
      const input = {
        session_id: args.sessionId as string,
      };
      const result = await builderDiscard(input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ========================================================================
  // KNOWLEDGE LAYER TOOLS (Phase 3A)
  // ========================================================================

  // Tool: schema_get
  server.registerTool(
    'schema_get',
    {
      description:
        'Get validated schema information for a specific N8N node type. ' +
        'Returns all valid parameter formats, compatibility information, and examples. ' +
        'Use this before creating nodes to understand the correct structure.',
      inputSchema: {
        nodeType: z.string().describe('Simplified node type identifier (e.g., "if", "switch", "filter")'),
        typeVersion: z.number().optional().describe('Node type version number (optional, defaults to 1)'),
      },
    },
    async (args, _extra) => {
      const result = await handleSchemaGet(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: schema_list
  server.registerTool(
    'schema_list',
    {
      description:
        'List all available node schemas in the knowledge library. ' +
        'Useful for discovering what schemas are documented and available.',
      inputSchema: {
        status: z.enum(['recommended', 'deprecated', 'experimental']).optional().describe('Filter by format status (optional)'),
      },
    },
    async (args, _extra) => {
      const result = await handleSchemaList(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: quirks_check
  server.registerTool(
    'quirks_check',
    {
      description:
        'Check for known API/UI behavior mismatches (quirks) affecting a specific node type. ' +
        'Returns quirks with severity levels, symptoms, workarounds, and auto-fix availability. ' +
        'IMPORTANT: Always call this before creating nodes to avoid known issues.',
      inputSchema: {
        nodeType: z.string().describe('Simplified node type identifier (e.g., "if", "switch")'),
        typeVersion: z.number().optional().describe('Node type version number (optional)'),
      },
    },
    async (args, _extra) => {
      const result = await handleQuirksCheck(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: quirks_search
  server.registerTool(
    'quirks_search',
    {
      description:
        'Search for quirks by matching error symptoms or keywords. ' +
        'Useful when diagnosing unknown issues or debugging workflow problems. ' +
        'Example symptoms: "empty canvas", "could not find", "rendering error"',
      inputSchema: {
        symptoms: z.array(z.string()).describe('Array of symptom keywords to search for (e.g., ["empty", "canvas"])'),
      },
    },
    async (args, _extra) => {
      const result = await handleQuirksSearch(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: schema_validate
  server.registerTool(
    'schema_validate',
    {
      description:
        'Validate node parameters against known schema formats. ' +
        'Checks if parameters match any valid format and returns errors/warnings. ' +
        'Detects deprecated formats and UI-incompatible structures. ' +
        'Use before committing workflows to prevent rendering issues.',
      inputSchema: {
        nodeType: z.string().describe('Simplified node type identifier'),
        parameters: z.record(z.string(), z.any()).describe('Node parameters to validate (JSON object)'),
        typeVersion: z.number().optional().describe('Node type version number (optional)'),
      },
    },
    async (args, _extra) => {
      const result = await handleSchemaValidate(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}

/**
 * Start MCP N8N Server using @strange/mcp-core transport
 *
 * Migrated to use standardized transport layer from mcp-core v1.2.0.
 * Eliminates ~100 lines of transport boilerplate code.
 *
 * Refactored: 2026-01-23
 * See: /home/strange/.claude/briefs/mcp-platform-dependencies-2026-01-23.md
 */
export async function startServer(config: N8NMcpServerConfig): Promise<void> {
  // Initialize canonical schema system (Phase 3)
  initializeSchemas();
  console.log(`🎯 Target API detected: ${detectAPI()}`);

  // Initialize session store (Redis or In-Memory based on REDIS_URL)
  await initSessionStore();
  console.log(`🗄️  Builder session store: ${getSessionStoreType()}`);

  // Initialize N8N client
  const client = new N8NClient({
    baseUrl: config.n8nUrl,
    apiKey: config.apiKey,
    timeout: config.timeout || 30000,
  });

  console.log(`🎯 N8N URL: ${config.n8nUrl}`);

  // Use standardized transport from mcp-core
  await createStreamableHttpServer({
    serverInfo: {
      name: 'strange-mcp-n8n',
      version: '1.2.0',
    },
    serverFactory: () => createMcpServer(client),
    apiKey: config.mcpApiKey,
    httpPort: config.httpPort ?? 3302,
    httpHost: config.httpHost ?? '0.0.0.0',
    sessionTimeout: config.sessionTimeout,
    cleanupInterval: config.cleanupInterval,
    onSessionInitialized: (sessionId: string) => {
      console.log(`📊 N8N session active: ${sessionId}`);
    },
    onSessionClosed: (sessionId: string) => {
      console.log(`📊 N8N session ended: ${sessionId}`);
    },
  });
}
