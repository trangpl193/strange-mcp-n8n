/**
 * P0-1 Phase 1: Output Metadata Calculation Tests
 * Tests for builder-add-node metadata calculation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { builderAddNode } from '../../../src/tools/builder-add-node.js';
import type { BuilderSession, McpSessionStore } from '../../../src/services/builder-types.js';

// Mock store
const mockStore = {
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('P0-1 Phase 1: Output Metadata - builder-add-node', () => {
  let baseSession: BuilderSession;

  beforeEach(() => {
    jest.clearAllMocks();

    baseSession = {
      id: 'test-session-123',
      workflow_draft: {
        name: 'Test Workflow',
        nodes: [],
        connections: [],
      },
      status: 'active',
      created_at: new Date().toISOString(),
      operations_log: [],
    };
  });

  describe('Metadata Calculation - expected_outputs', () => {
    test('should calculate expected_outputs for switch node based on rules count', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch',
            name: 'Switch',
            config: {
              rules: {
                values: [
                  { value: 1 },
                  { value: 2 },
                  { value: 3 },
                  { value: 4 },
                ],
              },
            },
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.success).toBe(true);
      expect(result.node.metadata?.expected_outputs).toBe(4);
      expect(result.node.metadata?.node_category).toBe('branching');

      // Verify stored in session
      const updateCall = mockStore.update.mock.calls[0][0];
      const addedNode = updateCall.workflow_draft.nodes[0];
      expect(addedNode.metadata?.expected_outputs).toBe(4);
    });

    test('should handle switch node with 2 rules', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch',
            config: {
              rules: {
                values: [{ value: 1 }, { value: 2 }],
              },
            },
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.expected_outputs).toBe(2);
    });

    test('should handle switch node with 1 rule', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch',
            config: {
              rules: {
                values: [{ value: 1 }],
              },
            },
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.expected_outputs).toBe(1);
    });

    test('should default switch node to 2 outputs when no rules provided', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch',
            config: {},
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      // Safe default when rules not yet configured
      expect(result.node.metadata?.expected_outputs).toBe(2);
    });

    test('should set expected_outputs to 2 for if node', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'if',
            config: {},
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.expected_outputs).toBe(2);
      expect(result.node.metadata?.node_category).toBe('branching');
    });

    test('should set expected_outputs to 2 for filter node', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'filter',
            config: {},
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.expected_outputs).toBe(2);
      expect(result.node.metadata?.node_category).toBe('branching');
    });

    test('should set expected_outputs to 1 for action nodes (postgres, http, etc)', async () => {
      const actionNodeTypes = ['postgres', 'http', 'code', 'set', 'discord'];

      for (const nodeType of actionNodeTypes) {
        mockStore.get.mockResolvedValue(baseSession);

        const result = await builderAddNode(
          {
            session_id: 'test-session-123',
            node: {
              type: nodeType,
              config: {},
            },
          },
          mockStore as jest.Mocked<McpSessionStore>
        );

        expect(result.node.metadata?.expected_outputs).toBe(1);
        expect(result.node.metadata?.node_category).toBe('action');
      }
    });

    test('should set expected_outputs to 1 for trigger nodes', async () => {
      const triggerNodeTypes = ['webhook', 'schedule', 'manual'];

      for (const nodeType of triggerNodeTypes) {
        mockStore.get.mockResolvedValue(baseSession);

        const result = await builderAddNode(
          {
            session_id: 'test-session-123',
            node: {
              type: nodeType,
              config: {},
            },
          },
          mockStore as jest.Mocked<McpSessionStore>
        );

        expect(result.node.metadata?.expected_outputs).toBe(1);
        expect(result.node.metadata?.node_category).toBe('trigger');
      }
    });
  });

  describe('Metadata Calculation - node_category', () => {
    test('should categorize trigger nodes correctly', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: { type: 'webhook', config: {} },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.node_category).toBe('trigger');
    });

    test('should categorize branching nodes correctly', async () => {
      const branchingTypes = ['switch', 'if', 'filter'];

      for (const nodeType of branchingTypes) {
        mockStore.get.mockResolvedValue(baseSession);

        const result = await builderAddNode(
          {
            session_id: 'test-session-123',
            node: { type: nodeType, config: {} },
          },
          mockStore as jest.Mocked<McpSessionStore>
        );

        expect(result.node.metadata?.node_category).toBe('branching');
      }
    });

    test('should categorize action nodes correctly', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: { type: 'postgres', config: {} },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.node_category).toBe('action');
    });
  });

  describe('Real-World Scenarios', () => {
    test('scenario: 4-branch switch for order processing', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch',
            name: 'Order Type Router',
            config: {
              rules: {
                values: [
                  { value: 'new_order' },
                  { value: 'cancelled' },
                  { value: 'refund' },
                  { value: 'exchange' },
                ],
              },
            },
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      // Should create exactly 4 outputs (no fallback in typeVersion 3.4)
      expect(result.node.metadata?.expected_outputs).toBe(4);
      expect(result.node.name).toBe('Order Type Router');
    });

    test('scenario: binary if node for authentication check', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'if',
            name: 'Auth Check',
            config: {},
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.expected_outputs).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing config gracefully', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch',
            // No config provided
          } as any,
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      // Should not crash, use safe default
      expect(result.node.metadata?.expected_outputs).toBeGreaterThanOrEqual(1);
    });

    test('should handle n8n-nodes-base prefix in type', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      // Some nodes might come with full type name
      const result = await builderAddNode(
        {
          session_id: 'test-session-123',
          node: {
            type: 'switch', // Handler should normalize to 'n8n-nodes-base.switch'
            config: {
              rules: { values: [{ value: 1 }, { value: 2 }] },
            },
          },
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.node.metadata?.expected_outputs).toBe(2);
    });
  });
});
