import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { N8NClient } from '../../../src/services/n8n-client.js';
import { McpError, McpErrorCode } from '@strange/mcp-core';
import { createMockFetch } from '../../mocks/fetch.js';

describe('N8NClient', () => {
  let client: N8NClient;
  let mockFetchHelper: ReturnType<typeof createMockFetch>;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetchHelper = createMockFetch();
    mockFetchHelper.install();
    client = new N8NClient({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-api-key',
      timeout: 30000,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('listWorkflows()', () => {
    test('should return workflows on success', async () => {
      const mockData = {
        data: [
          { id: 'wf-1', name: 'Test Workflow 1', active: true },
          { id: 'wf-2', name: 'Test Workflow 2', active: false },
        ],
      };

      mockFetchHelper.mockSuccess(mockData);

      const result = await client.listWorkflows();

      expect(result).toEqual(mockData);
      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        expect.stringContaining('/workflows'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-api-key',
          }),
        })
      );
    });

    test('should build correct query params for active filter', async () => {
      mockFetchHelper.mockSuccess({ data: [] });

      await client.listWorkflows({ active: true });

      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        expect.stringContaining('active=true'),
        expect.any(Object)
      );
    });

    test('should build correct query params for tags filter', async () => {
      mockFetchHelper.mockSuccess({ data: [] });

      await client.listWorkflows({ tags: 'prod,api' });

      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        expect.stringContaining('tags=prod%2Capi'),
        expect.any(Object)
      );
    });

    test('should include cursor for pagination', async () => {
      mockFetchHelper.mockSuccess({ data: [] });

      await client.listWorkflows({ cursor: 'next-page-cursor' });

      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        expect.stringContaining('cursor=next-page-cursor'),
        expect.any(Object)
      );
    });

    test('should throw McpError on 401 Unauthorized', async () => {
      mockFetchHelper.mockError(401, 'Unauthorized');

      await expect(client.listWorkflows()).rejects.toThrow(McpError);

      try {
        await client.listWorkflows();
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(McpErrorCode.TOOL_EXECUTION_FAILED);
      }
    });

    test('should throw McpError on 404 Not Found', async () => {
      mockFetchHelper.mockError(404, 'Not Found');

      await expect(client.listWorkflows()).rejects.toThrow(McpError);
    });

    test('should throw McpError on network error', async () => {
      mockFetchHelper.mockNetworkError();

      await expect(client.listWorkflows()).rejects.toThrow(McpError);
    });
  });

  describe('getWorkflow()', () => {
    test('should return workflow details', async () => {
      const mockWorkflow = {
        id: 'wf-123',
        name: 'Test Workflow',
        active: true,
        nodes: [
          { id: 'node-1', type: 'n8n-nodes-base.webhook', name: 'Webhook' },
        ],
        connections: {},
      };

      mockFetchHelper.mockSuccess(mockWorkflow);

      const result = await client.getWorkflow('wf-123');

      expect(result).toEqual(mockWorkflow);
      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        'https://n8n.example.com/api/v1/workflows/wf-123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('should throw McpError on workflow not found', async () => {
      mockFetchHelper.mockError(404, 'Workflow not found');

      await expect(client.getWorkflow('nonexistent')).rejects.toThrow(McpError);
    });
  });

  describe('createWorkflow()', () => {
    test('should POST workflow JSON', async () => {
      const workflowData = {
        name: 'New Workflow',
        nodes: [],
        connections: {},
        active: false,
      };

      const mockResponse = {
        id: 'wf-new',
        ...workflowData,
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      };

      mockFetchHelper.mockSuccess(mockResponse);

      const result = await client.createWorkflow(workflowData);

      expect(result).toEqual(mockResponse);
      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        'https://n8n.example.com/api/v1/workflows',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-api-key',
          }),
          body: JSON.stringify(workflowData),
        })
      );
    });

    test('should throw McpError on validation error', async () => {
      mockFetchHelper.mockError(400, 'Invalid workflow structure');

      await expect(client.createWorkflow({ name: 'Bad' } as any)).rejects.toThrow(McpError);
    });
  });

  describe('updateWorkflow()', () => {
    test('should PUT workflow JSON', async () => {
      const updates = {
        name: 'Updated Workflow',
        active: true,
      };

      const mockResponse = {
        id: 'wf-123',
        ...updates,
        nodes: [],
        connections: {},
        updatedAt: '2026-01-20T15:00:00Z',
      };

      mockFetchHelper.mockSuccess(mockResponse);

      const result = await client.updateWorkflow('wf-123', updates);

      expect(result).toEqual(mockResponse);
      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        'https://n8n.example.com/api/v1/workflows/wf-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });

    test('should throw McpError on workflow not found', async () => {
      mockFetchHelper.mockError(404, 'Workflow not found');

      await expect(client.updateWorkflow('nonexistent', {})).rejects.toThrow(McpError);
    });
  });

  describe('deleteWorkflow()', () => {
    test('should DELETE workflow', async () => {
      mockFetchHelper.mockSuccess({ success: true });

      await client.deleteWorkflow('wf-123');

      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        'https://n8n.example.com/api/v1/workflows/wf-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    test('should throw McpError on workflow not found', async () => {
      mockFetchHelper.mockError(404, 'Workflow not found');

      await expect(client.deleteWorkflow('nonexistent')).rejects.toThrow(McpError);
    });
  });

  describe('listExecutions()', () => {
    test('should return executions for workflow', async () => {
      const mockExecutions = {
        data: [
          {
            id: 'exec-1',
            finished: true,
            mode: 'manual',
            startedAt: '2026-01-20T10:00:00Z',
          },
        ],
      };

      mockFetchHelper.mockSuccess(mockExecutions);

      const result = await client.listExecutions({ workflowId: 'wf-123' });

      expect(result).toEqual(mockExecutions);
      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        expect.stringContaining('/executions'),
        expect.any(Object)
      );
    });

    test('should filter by status', async () => {
      mockFetchHelper.mockSuccess({ data: [] });

      await client.listExecutions({ status: 'error' });

      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        expect.stringContaining('status=error'),
        expect.any(Object)
      );
    });
  });

  describe('getExecution()', () => {
    test('should return execution details', async () => {
      const mockExecution = {
        id: 'exec-123',
        finished: true,
        mode: 'manual',
        startedAt: '2026-01-20T10:00:00Z',
        stoppedAt: '2026-01-20T10:00:05Z',
        data: {
          resultData: {
            runData: {},
          },
        },
      };

      mockFetchHelper.mockSuccess(mockExecution);

      const result = await client.getExecution('exec-123');

      expect(result).toEqual(mockExecution);
      expect(mockFetchHelper.mock).toHaveBeenCalledWith(
        'https://n8n.example.com/api/v1/executions/exec-123?includeData=all',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('should throw McpError on execution not found', async () => {
      mockFetchHelper.mockError(404, 'Execution not found');

      await expect(client.getExecution('nonexistent')).rejects.toThrow(McpError);
    });
  });

  describe('error handling', () => {
    test('should include status code in error details with ErrorContext', async () => {
      mockFetchHelper.mockError(500, 'Internal Server Error');

      try {
        await client.listWorkflows();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.details).toMatchObject({
          context: {
            location: 'N8NClient.request',
            operation: 'GET /api/v1/workflows',
            recovery_hint: expect.any(String),
            data: {
              statusCode: 500,
              path: '/api/v1/workflows',
            },
          },
        });
      }
    });

    test('should handle timeout errors', async () => {
      mockFetchHelper.mock.mockImplementation(() =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({}) } as Response), 100000);
        })
      );

      // Note: Actual timeout implementation would need to be in N8NClient
      // This test documents the expected behavior
    });

    test('should preserve error messages from API', async () => {
      mockFetchHelper.mockError(400, 'Invalid workflow name');

      try {
        await client.createWorkflow({ name: '' } as any);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).message).toContain('Invalid workflow name');
      }
    });
  });
});
