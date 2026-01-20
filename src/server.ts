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
  executionList,
  executionDebug,
  type WorkflowListInput,
  type WorkflowCreateInput,
  type WorkflowGetInput,
  type ExecutionListInput,
  type ExecutionDebugInput,
} from './tools/index.js';

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

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
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
            const input = args as WorkflowCreateInput;
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
            const input = args as WorkflowGetInput;
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

          case 'execution_list': {
            const input = args as ExecutionListInput;
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
            const input = args as ExecutionDebugInput;
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
