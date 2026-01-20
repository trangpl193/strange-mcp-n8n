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
  credentialList,
  type WorkflowListInput,
  type CredentialListInput,
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
          name: 'credential_list',
          description: 'List available N8N credentials. Returns credential ID, name, and type for use in workflow configuration.',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Filter by credential type (e.g., "postgres", "discord")',
              },
            },
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

          case 'credential_list': {
            const input = args as CredentialListInput;
            const result = await credentialList(this.client, input);
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
