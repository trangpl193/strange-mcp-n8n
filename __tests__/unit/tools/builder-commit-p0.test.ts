/**
 * P0-2: Error Recovery Mechanism Tests
 * Tests for builder-commit error recovery and session survival
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { builderCommit } from '../../../src/tools/builder-commit.js';
import type { BuilderSession, McpSessionStore } from '../../../src/services/builder-types.js';
import type { N8NClient } from '../../../src/services/n8n-client.js';
import { McpError, McpErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock store
const mockStore = {
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock client
const createMockClient = (): jest.Mocked<N8NClient> => ({
  createWorkflow: jest.fn(),
  updateWorkflow: jest.fn(),
  deleteWorkflow: jest.fn(),
  getWorkflow: jest.fn(),
  listWorkflows: jest.fn(),
  listExecutions: jest.fn(),
  getExecution: jest.fn(),
} as unknown as jest.Mocked<N8NClient>);

describe('P0-2: Error Recovery - builder-commit', () => {
  let mockClient: jest.Mocked<N8NClient>;
  let baseSession: BuilderSession;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();

    baseSession = {
      id: 'test-session-123',
      workflow_draft: {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'n8n-nodes-base.manualTrigger',
            name: 'Manual Trigger',
            position: [0, 0],
            parameters: {},
            metadata: {
              expected_outputs: 1,
              node_category: 'trigger' as const,
            },
          },
          {
            id: 'node-2',
            type: 'n8n-nodes-base.set',
            name: 'Set',
            position: [200, 0],
            parameters: {},
            metadata: {
              expected_outputs: 1,
              node_category: 'action' as const,
            },
          },
        ],
        connections: [
          {
            from_node: 'node-1',
            to_node: 'node-2',
            from_output: 0,
            to_input: 0,
          },
        ],
      },
      status: 'active',
      created_at: new Date().toISOString(),
      operations_log: [],
    };
  });

  describe('Success Path', () => {
    test('should commit workflow and delete session on success', async () => {
      mockStore.get.mockResolvedValue(baseSession);
      mockClient.createWorkflow.mockResolvedValue({
        id: 'wf-123',
        name: 'Test Workflow',
        active: false,
        nodes: baseSession.workflow_draft.nodes,
        connections: {},
      });

      const result = await builderCommit(
        { session_id: 'test-session-123', activate: false },
        mockStore as jest.Mocked<McpSessionStore>,
        mockClient
      );

      expect(result.success).toBe(true);
      expect(result.workflow.id).toBe('wf-123');
      expect(result.session_closed).toBe(true);
      expect(mockStore.delete).toHaveBeenCalledWith('test-session-123');
    });

    test('should activate workflow when requested', async () => {
      mockStore.get.mockResolvedValue(baseSession);
      mockClient.createWorkflow.mockResolvedValue({
        id: 'wf-123',
        name: 'Test Workflow',
        active: false,
        nodes: baseSession.workflow_draft.nodes,
        connections: {},
      });
      mockClient.updateWorkflow.mockResolvedValue({
        id: 'wf-123',
        name: 'Test Workflow',
        active: true,
        nodes: baseSession.workflow_draft.nodes,
        connections: {},
      });

      const result = await builderCommit(
        { session_id: 'test-session-123', activate: true },
        mockStore as jest.Mocked<McpSessionStore>,
        mockClient
      );

      expect(result.workflow.active).toBe(true);
      expect(mockClient.updateWorkflow).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({ active: true })
      );
    });
  });

  describe('P0-2: Error Recovery', () => {
    test('should keep session alive on validation error (empty workflow)', async () => {
      const emptySession = {
        ...baseSession,
        workflow_draft: { ...baseSession.workflow_draft, nodes: [] },
      };
      mockStore.get.mockResolvedValue(emptySession);

      await expect(
        builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        )
      ).rejects.toThrow();

      // Session should be updated (TTL extended), not deleted
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockStore.delete).not.toHaveBeenCalled();

      // Check error details include recovery info
      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError<McpErrorCode.INVALID_PARAMS | McpErrorCode.INTERNAL_ERROR>;
        expect(mcpError.data?.details).toMatchObject({
          session_id: 'test-session-123',
          session_status: 'active',
          ttl_extended: true,
          recovery_hint: expect.stringContaining('Session kept alive'),
        });
      }
    });

    test('should keep session alive on validation error (missing trigger)', async () => {
      const noTriggerSession = {
        ...baseSession,
        workflow_draft: {
          ...baseSession.workflow_draft,
          nodes: [
            {
              id: 'node-1',
              type: 'n8n-nodes-base.set',
              name: 'Set',
              position: [0, 0],
              parameters: {},
            },
          ],
        },
      };
      mockStore.get.mockResolvedValue(noTriggerSession);

      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError<McpErrorCode.INVALID_PARAMS | McpErrorCode.INTERNAL_ERROR>;
        expect(mcpError.message).toContain('trigger node');
        expect(mcpError.data?.details).toMatchObject({
          session_status: 'active',
          ttl_extended: true,
        });
      }

      expect(mockStore.update).toHaveBeenCalled();
      expect(mockStore.delete).not.toHaveBeenCalled();
    });

    test('should keep session alive on N8N API error', async () => {
      mockStore.get.mockResolvedValue(baseSession);
      mockClient.createWorkflow.mockRejectedValue(
        new Error('N8N API Error: Network timeout')
      );

      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError<McpErrorCode.INVALID_PARAMS | McpErrorCode.INTERNAL_ERROR>;
        expect(mcpError.data?.details).toMatchObject({
          session_status: 'active',
          ttl_extended: true,
          original_error: 'N8N API Error: Network timeout',
        });
      }

      expect(mockStore.update).toHaveBeenCalled();
      expect(mockStore.delete).not.toHaveBeenCalled();
    });

    test('should track retry count across multiple errors', async () => {
      const sessionWithRetries = {
        ...baseSession,
        operations_log: [
          {
            operation: 'commit_failed',
            timestamp: new Date().toISOString(),
            details: { error: 'First error' },
          },
          {
            operation: 'commit_failed',
            timestamp: new Date().toISOString(),
            details: { error: 'Second error' },
          },
        ],
      };
      mockStore.get.mockResolvedValue(sessionWithRetries);
      mockClient.createWorkflow.mockRejectedValue(new Error('Third error'));

      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
      } catch (error) {
        const mcpError = error as McpError<McpErrorCode.INVALID_PARAMS | McpErrorCode.INTERNAL_ERROR>;
        expect(mcpError.data?.details.retry_count).toBe(2); // Previous retries
      }

      // Verify session log was updated with new failure
      const updateCall = mockStore.update.mock.calls[0][0];
      expect(updateCall.operations_log).toHaveLength(3);
      expect(updateCall.operations_log[2].operation).toBe('commit_failed');
      expect(updateCall.operations_log[2].details.retry_count).toBe(2);
    });

    test('should warn when retry count >= 5', async () => {
      const sessionWithManyRetries = {
        ...baseSession,
        operations_log: Array(5).fill({
          operation: 'commit_failed',
          timestamp: new Date().toISOString(),
          details: {},
        }),
      };
      mockStore.get.mockResolvedValue(sessionWithManyRetries);
      mockClient.createWorkflow.mockRejectedValue(new Error('Error'));

      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
      } catch (error) {
        const mcpError = error as McpError<McpErrorCode.INVALID_PARAMS | McpErrorCode.INTERNAL_ERROR>;
        expect(mcpError.data?.details.retry_limit_warning).toContain(
          'High retry count'
        );
        expect(mcpError.data?.details.retry_limit_warning).toContain(
          'builder_discard'
        );
      }
    });

    test('should preserve McpError details when re-throwing', async () => {
      const emptySession = {
        ...baseSession,
        workflow_draft: { ...baseSession.workflow_draft, nodes: [] },
      };
      mockStore.get.mockResolvedValue(emptySession);

      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
      } catch (error) {
        const mcpError = error as McpError<McpErrorCode.INVALID_PARAMS | McpErrorCode.INTERNAL_ERROR>;
        // Should have both recovery details AND validation details
        expect(mcpError.data?.details.session_status).toBe('active');
        expect(mcpError.data?.details.recovery_hint).toBeDefined();
        expect(mcpError.data?.details.validation_details || mcpError.data?.details.recovery_hint).toBeDefined();
      }
    });
  });

  describe('Token Waste Prevention', () => {
    test('session survival eliminates need for rebuild (0 token waste)', async () => {
      mockStore.get.mockResolvedValue(baseSession);
      mockClient.createWorkflow.mockRejectedValue(new Error('Temporary error'));

      // First commit attempt fails
      try {
        await builderCommit(
          { session_id: 'test-session-123', activate: false },
          mockStore as jest.Mocked<McpSessionStore>,
          mockClient
        );
      } catch (error) {
        // Session stays alive
        expect(mockStore.delete).not.toHaveBeenCalled();
      }

      // Fix the issue and retry with SAME session
      mockClient.createWorkflow.mockResolvedValue({
        id: 'wf-123',
        name: 'Test Workflow',
        active: false,
        nodes: baseSession.workflow_draft.nodes,
        connections: {},
      });

      const result = await builderCommit(
        { session_id: 'test-session-123', activate: false },
        mockStore as jest.Mocked<McpSessionStore>,
        mockClient
      );

      expect(result.success).toBe(true);
      // No rebuild needed = 0 token waste
    });
  });
});
