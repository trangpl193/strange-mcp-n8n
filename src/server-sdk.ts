/**
 * MCP N8N Server using Official SDK
 *
 * This server uses @modelcontextprotocol/sdk for transport layer
 * while keeping custom tool implementations.
 *
 * Created: 2026-01-20
 * Reason: Claude Code CLI requires Streamable HTTP protocol
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createApiKeyMiddleware, SessionCleanup } from '@strange/mcp-core';
import { N8NClient } from './services/index.js';
import {
  workflowList,
  workflowCreate,
  workflowGet,
  workflowUpdate,
  executionList,
  executionDebug,
} from './tools/index.js';

// Configuration interface
export interface N8NMcpServerConfig {
  n8nUrl: string;
  apiKey: string;
  mcpApiKey: string;
  timeout?: number;
  httpPort?: number;
  httpHost?: string;
}

// Transport session storage
const transports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Check if request is an initialize request
 */
function isInitializeRequest(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'method' in body &&
    (body as { method: string }).method === 'initialize'
  );
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
      const result = await workflowGet(client, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: workflow_create
  server.registerTool(
    'workflow_create',
    {
      description: 'Create a new N8N workflow from simplified schema. Returns created workflow with ID.',
      inputSchema: {
        name: z.string().describe('Workflow name'),
        steps: z.array(z.any()).describe('Array of workflow steps'),
        active: z.boolean().optional().describe('Set workflow as active'),
        tags: z.array(z.string()).optional().describe('Workflow tags'),
      },
    },
    async (args: { name: string; steps: any[]; active?: boolean; tags?: string[] }) => {
      const result = await workflowCreate(client, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: workflow_update
  server.registerTool(
    'workflow_update',
    {
      description: 'Update an existing N8N workflow. Requires full workflow definition.',
      inputSchema: {
        workflowId: z.string().describe('Workflow ID'),
        name: z.string().optional().describe('New workflow name'),
        active: z.boolean().optional().describe('Set active status'),
        tags: z.array(z.string()).optional().describe('Workflow tags'),
        nodes: z.array(z.any()).optional().describe('Updated nodes'),
        connections: z.any().optional().describe('Updated connections'),
      },
    },
    async (args: {
      workflowId: string;
      name?: string;
      active?: boolean;
      tags?: string[];
      nodes?: any[];
      connections?: any;
    }) => {
      const result = await workflowUpdate(client, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: execution_list
  server.registerTool(
    'execution_list',
    {
      description: 'List N8N workflow executions with filtering. Returns execution summaries.',
      inputSchema: {
        workflowId: z.string().optional().describe('Filter by workflow ID'),
        status: z.string().optional().describe('Filter by status (running, success, error)'),
        limit: z.number().optional().describe('Maximum number of executions to return'),
      },
    },
    async (args: { workflowId?: string; status?: string; limit?: number }) => {
      const result = await executionList(client, args);
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
    async (args: { executionId: string }) => {
      const result = await executionDebug(client, args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}

/**
 * Start HTTP server with StreamableHTTP transport
 */
export async function startServer(config: N8NMcpServerConfig): Promise<void> {
  const app = express();
  app.use(express.json());

  const httpPort = config.httpPort || 3302;
  const httpHost = config.httpHost || '0.0.0.0';

  // Initialize N8N client
  const client = new N8NClient({
    baseUrl: config.n8nUrl,
    apiKey: config.apiKey,
    timeout: config.timeout || 30000,
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'strange-mcp-n8n',
      version: '1.2.0',
      transport: 'streamable-http',
      timestamp: new Date().toISOString(),
    });
  });

  // Session cleanup manager
  const sessionCleanup = new SessionCleanup({
    sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
    cleanupIntervalMs: 5 * 60 * 1000,  // 5 minutes
    onSessionCleanup: (sessionId) => {
      if (transports[sessionId]) {
        console.log(`🗑️  Cleaned up stale session: ${sessionId}`);
        delete transports[sessionId];
      }
    },
  });

  // API key authentication middleware (from mcp-core)
  const authenticate = createApiKeyMiddleware({ apiKey: config.mcpApiKey });

  // MCP endpoint
  app.post('/mcp', authenticate, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport - update activity
        transport = transports[sessionId];
        sessionCleanup.updateActivity(sessionId);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New session initialization
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            console.log(`✅ Session initialized: ${newSessionId}`);
            transports[newSessionId] = transport;
            sessionCleanup.registerSession(newSessionId);
          },
        });

        // Cleanup on close
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`❌ Session closed: ${sid}`);
            sessionCleanup.removeSession(sid);
            delete transports[sid];
          }
        };

        // Connect MCP server to transport
        const server = createMcpServer(client);
        await server.connect(transport);

        // Handle this request
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }

      // Handle request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('❌ MCP request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // Start server
  return new Promise((resolve) => {
    app.listen(httpPort, httpHost, () => {
      console.log(`🚀 MCP N8N Server listening on http://${httpHost}:${httpPort}/mcp`);
      console.log(`📊 Health check: http://${httpHost}:${httpPort}/health`);
      console.log(`🔑 API Key authentication enabled`);
      console.log(`🎯 N8N URL: ${config.n8nUrl}`);
      resolve();
    });
  });
}
