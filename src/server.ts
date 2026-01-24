import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { N8NClient } from './services/index.js';
import { loadConfig } from './config.js';
import {
  workflowList,
  workflowCreate,
  workflowGet,
  workflowUpdate,
  workflowValidateRender,
  executionList,
  executionDebug,
  type WorkflowListInput,
  type WorkflowCreateInput,
  type WorkflowGetInput,
  type WorkflowUpdateInput,
  type WorkflowValidateRenderInput,
  type ExecutionListInput,
  type ExecutionDebugInput,
} from './tools/index.js';
import { knowledgeLayerTools } from './knowledge/index.js';
import {
  handleSchemaGet,
  handleSchemaList,
  handleQuirksCheck,
  handleQuirksSearch,
  handleSchemaValidate,
} from './knowledge/index.js';
import { initializeCoreSchemas } from './knowledge/index.js';

/**
 * MCP Server for N8N
 */
export class N8NMCPServer {
  private server: Server;
  private client: N8NClient;

  constructor() {
    // Load config
    const config = loadConfig();

    // Initialize N8N client
    this.client = new N8NClient({
      baseUrl: config.n8nUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'strange-mcp-n8n',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize knowledge layer
    initializeCoreSchemas().catch((err) => {
      console.error('Failed to initialize knowledge layer:', err);
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Workflow tools
        {
          name: 'workflow_list',
          description: 'List N8N workflows with filtering. Returns workflow summaries with metadata.',
          inputSchema: {
            type: 'object',
            properties: {
              active: {
                type: 'boolean',
                description: 'Filter by active status',
              },
              tags: {
                type: 'string',
                description: 'Filter by tags (comma-separated)',
              },
              name: {
                type: 'string',
                description: 'Filter by workflow name (partial match)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 100)',
                default: 100,
              },
              cursor: {
                type: 'string',
                description: 'Pagination cursor from previous response',
              },
            },
          },
        },
        {
          name: 'workflow_create',
          description: 'Create N8N workflow from simplified schema. Transforms AI-friendly format to N8N format.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'object',
                description: 'Simplified workflow definition',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Workflow name',
                  },
                  description: {
                    type: 'string',
                    description: 'Workflow description (optional)',
                  },
                  steps: {
                    type: 'array',
                    description: 'Workflow steps',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          description: 'Node type: webhook, postgres, http, discord, respond, if, switch, merge, set, code',
                        },
                        name: {
                          type: 'string',
                          description: 'Step name (optional, auto-generated if missing)',
                        },
                        action: {
                          type: 'string',
                          description: 'Action for nodes with multiple actions (e.g., insert, select)',
                        },
                        config: {
                          type: 'object',
                          description: 'Type-specific configuration',
                        },
                        credential: {
                          type: 'string',
                          description: 'Credential name (will be resolved to ID)',
                        },
                        next: {
                          description: 'Connection target(s) by step name',
                        },
                      },
                      required: ['type'],
                    },
                  },
                },
                required: ['name', 'steps'],
              },
              credentials: {
                type: 'object',
                description: 'Map of credential name → credential ID',
              },
              activate: {
                type: 'boolean',
                description: 'Activate workflow after creation (default: false)',
                default: false,
              },
            },
            required: ['workflow'],
          },
        },
        {
          name: 'workflow_get',
          description: 'Get N8N workflow details by ID. Returns full workflow structure with nodes and connections.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'Workflow ID',
              },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'workflow_update',
          description: 'Update existing N8N workflow. Supports three strategies: (1) Full replacement with simplified schema, (2) Direct N8N JSON update, (3) Quick operations (activate, rename, tags).',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'Workflow ID to update',
              },
              workflow: {
                type: 'object',
                description: 'Full replacement with simplified schema (Strategy 1)',
              },
              credentials: {
                type: 'object',
                description: 'Credential name → ID mapping for Strategy 1',
              },
              workflow_json: {
                type: 'object',
                description: 'Direct N8N JSON update (Strategy 2, advanced)',
              },
              activate: {
                type: 'boolean',
                description: 'Quick operation: Activate/deactivate workflow (Strategy 3)',
              },
              rename: {
                type: 'string',
                description: 'Quick operation: Rename workflow (Strategy 3)',
              },
              add_tags: {
                type: 'array',
                description: 'Quick operation: Add tags (Strategy 3)',
                items: {
                  type: 'string',
                },
              },
              remove_tags: {
                type: 'array',
                description: 'Quick operation: Remove tags (Strategy 3)',
                items: {
                  type: 'string',
                },
              },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'execution_list',
          description: 'List workflow executions with filtering. Returns execution summaries with status and duration.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'Filter by workflow ID (optional)',
              },
              status: {
                type: 'string',
                description: 'Filter by execution status: success, error, running, waiting',
                enum: ['success', 'error', 'running', 'waiting'],
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 100)',
                default: 100,
              },
              cursor: {
                type: 'string',
                description: 'Pagination cursor from previous response',
              },
            },
          },
        },
        {
          name: 'execution_debug',
          description: 'Get detailed execution debug information with node-level I/O and errors. Essential for debugging workflow issues.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_id: {
                type: 'string',
                description: 'Execution ID',
              },
              include_data: {
                type: 'string',
                description: 'Data inclusion level: none, result, all (default: all)',
                enum: ['none', 'result', 'all'],
                default: 'all',
              },
            },
            required: ['execution_id'],
          },
        },
        // Knowledge layer tools
        ...knowledgeLayerTools,
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'workflow_list': {
            const input = args as WorkflowListInput;
            const result = await workflowList(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'workflow_create': {
            // Adapter: Map MCP flat params to nested WorkflowCreateInput
            const rawArgs = args as unknown as { name: string; steps: any[]; active?: boolean; credentials?: Record<string, string> };
            const input: WorkflowCreateInput = {
              workflow: {
                name: rawArgs.name,
                steps: rawArgs.steps,
              },
              credentials: rawArgs.credentials,
              activate: rawArgs.active,
            };
            const result = await workflowCreate(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'workflow_get': {
            // Adapter: Map workflowId to workflow_id
            const rawArgs = args as unknown as { workflowId: string };
            const input: WorkflowGetInput = { workflow_id: rawArgs.workflowId };
            const result = await workflowGet(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'workflow_update': {
            // Adapter: Map MCP params to WorkflowUpdateInput with strategy detection
            const rawArgs = args as unknown as {
              workflowId: string;
              name?: string;
              steps?: any[];
              credentials?: Record<string, string>;
              nodes?: any[];
              connections?: any;
              active?: boolean;
              rename?: string;
              addTags?: string[];
              removeTags?: string[];
            };
            const input: WorkflowUpdateInput = {
              workflow_id: rawArgs.workflowId,
            };

            if (rawArgs.steps) {
              input.workflow = {
                name: rawArgs.name || '',
                steps: rawArgs.steps,
              };
              input.credentials = rawArgs.credentials;
            } else if (rawArgs.nodes) {
              input.workflow_json = {
                name: rawArgs.name,
                nodes: rawArgs.nodes,
                connections: rawArgs.connections,
                active: rawArgs.active,
              };
            } else {
              if (rawArgs.active !== undefined) input.activate = rawArgs.active;
              if (rawArgs.rename) input.rename = rawArgs.rename;
              if (rawArgs.addTags) input.add_tags = rawArgs.addTags;
              if (rawArgs.removeTags) input.remove_tags = rawArgs.removeTags;
            }

            const result = await workflowUpdate(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'workflow_validate_render': {
            // Adapter: Map workflow_id from camelCase to snake_case
            const rawArgs = args as unknown as { workflow_id: string };
            const input: WorkflowValidateRenderInput = {
              workflow_id: rawArgs.workflow_id,
            };
            const result = await workflowValidateRender(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'execution_list': {
            // Adapter: Map camelCase to snake_case
            const rawArgs = args as unknown as { workflowId?: string; status?: string; limit?: number };
            const input: ExecutionListInput = {
              workflow_id: rawArgs.workflowId,
              status: rawArgs.status as ExecutionListInput['status'],
              limit: rawArgs.limit,
            };
            const result = await executionList(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'execution_debug': {
            // Adapter: Map executionId to execution_id
            const rawArgs = args as unknown as { executionId: string };
            const input: ExecutionDebugInput = { execution_id: rawArgs.executionId };
            const result = await executionDebug(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          // Knowledge layer tools
          case 'schema_get': {
            const result = await handleSchemaGet(args as { nodeType: string; typeVersion?: number });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'schema_list': {
            const result = await handleSchemaList(args as { status?: 'recommended' | 'deprecated' | 'experimental' });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'quirks_check': {
            const result = await handleQuirksCheck(args as { nodeType: string; typeVersion?: number });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'quirks_search': {
            const result = await handleQuirksSearch(args as { symptoms: string[] });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'schema_validate': {
            const result = await handleSchemaValidate(args as {
              nodeType: string;
              parameters: Record<string, unknown>;
              typeVersion?: number;
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: error.message,
                    details: (error as any).details || {},
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('N8N MCP Server running on stdio');
  }
}
