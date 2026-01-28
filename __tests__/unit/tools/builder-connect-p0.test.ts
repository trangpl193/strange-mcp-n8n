/**
 * P0-1 Phase 2 + P0-3: Connection Validation with Rich Errors
 * Tests for builder-connect eager validation and rich error messages
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { builderConnect } from '../../../src/tools/builder-connect.js';
import type { BuilderSession, McpSessionStore } from '../../../src/services/builder-types.js';
import { McpError, McpErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock store
const mockStore = {
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('P0-1 Phase 2 + P0-3: Connection Validation - builder-connect', () => {
  let baseSession: BuilderSession;

  beforeEach(() => {
    jest.clearAllMocks();

    baseSession = {
      id: 'test-session-123',
      workflow_draft: {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'switch-1',
            type: 'n8n-nodes-base.switch',
            name: 'Switch',
            position: [0, 0],
            parameters: {
              rules: {
                values: [
                  { conditions: {} },
                  { conditions: {} },
                  { conditions: {} },
                  { conditions: {} },
                ],
              },
            },
            metadata: {
              expected_outputs: 4,
              node_category: 'branching' as const,
            },
          },
          {
            id: 'if-1',
            type: 'n8n-nodes-base.if',
            name: 'If',
            position: [200, 0],
            parameters: {},
            metadata: {
              expected_outputs: 2,
              node_category: 'branching' as const,
            },
          },
          {
            id: 'action-1',
            type: 'n8n-nodes-base.set',
            name: 'Action1',
            position: [400, 0],
            parameters: {},
            metadata: {
              expected_outputs: 1,
              node_category: 'action' as const,
            },
          },
          {
            id: 'action-2',
            type: 'n8n-nodes-base.set',
            name: 'Action2',
            position: [400, 100],
            parameters: {},
            metadata: {
              expected_outputs: 1,
              node_category: 'action' as const,
            },
          },
        ],
        connections: [],
      },
      status: 'active',
      created_at: new Date().toISOString(),
      operations_log: [],
    };
  });

  describe('P0-1: Eager Validation', () => {
    test('should validate and allow valid connection from switch output 0', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'Switch',
          to_node: 'Action1',
          from_output: 0,
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.success).toBe(true);
      expect(result.connection).toMatchObject({
        from: 'Switch',
        to: 'Action1',
        from_output: 0,
      });
      expect(result.validation?.output_index_valid).toBe(true);
      expect(result.validation?.validated_against_metadata).toBe(true);
    });

    test('should validate and allow valid connection from switch output 3 (last valid)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'Switch',
          to_node: 'Action1',
          from_output: 3, // Last valid output for 4-rule switch
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.success).toBe(true);
      expect(result.connection.from_output).toBe(3);
    });

    test('should IMMEDIATELY reject invalid connection from switch output 4', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4, // INVALID - only 0-3 exist
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(McpErrorCode.INVALID_PARAMS);
        expect(mcpError.message).toContain('only has 4 output');
      }

      // Session should stay alive (no delete)
      expect(mockStore.delete).not.toHaveBeenCalled();
    });

    test('should validate if node has exactly 2 outputs', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      // Valid: output 0
      const result1 = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'If',
          to_node: 'Action1',
          from_output: 0,
        },
        mockStore as jest.Mocked<McpSessionStore>
      );
      expect(result1.success).toBe(true);

      // Valid: output 1
      const result2 = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'If',
          to_node: 'Action2',
          from_output: 1,
        },
        mockStore as jest.Mocked<McpSessionStore>
      );
      expect(result2.success).toBe(true);

      // Invalid: output 2
      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'If',
            to_node: 'Action1',
            from_output: 2,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
      }
    });

    test('should default to output 0 when from_output not specified', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'Switch',
          to_node: 'Action1',
          // from_output not specified
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.success).toBe(true);
      expect(result.connection.from_output).toBe(0);
    });

    test('should validate action node with 1 output', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      // Valid: output 0 (default)
      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'Action1',
          to_node: 'Action2',
        },
        mockStore as jest.Mocked<McpSessionStore>
      );
      expect(result.success).toBe(true);

      // Invalid: output 1
      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Action1',
            to_node: 'Action2',
            from_output: 1,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
        fail('Should have thrown error');
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.message).toContain('only has 1 output');
      }
    });

    test('should fallback to 1 output if metadata missing', async () => {
      const sessionWithoutMetadata = {
        ...baseSession,
        workflow_draft: {
          ...baseSession.workflow_draft,
          nodes: [
            {
              id: 'node-1',
              type: 'n8n-nodes-base.set',
              name: 'OldNode',
              position: [0, 0],
              parameters: {},
              // No metadata field
            },
            {
              id: 'node-2',
              type: 'n8n-nodes-base.set',
              name: 'Target',
              position: [200, 0],
              parameters: {},
            },
          ],
          connections: [],
        },
      };
      mockStore.get.mockResolvedValue(sessionWithoutMetadata);

      // Should work with output 0 (safe default)
      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'OldNode',
          to_node: 'Target',
          from_output: 0,
        },
        mockStore as jest.Mocked<McpSessionStore>
      );
      expect(result.success).toBe(true);

      // Should reject output 1 (assumes 1 output when metadata missing)
      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'OldNode',
            to_node: 'Target',
            from_output: 1,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
      }
    });
  });

  describe('P0-3: Rich Error Messages', () => {
    test('error should include WHO (node details)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details).toMatchObject({
          node_name: 'Switch',
          node_type: 'n8n-nodes-base.switch',
          node_id: 'switch-1',
          node_category: 'branching',
        });
      }
    });

    test('error should include WHAT (requested vs expected)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details).toMatchObject({
          requested_output: 4,
          expected_outputs: 4,
          valid_range: '0 to 3',
        });
      }
    });

    test('error should include WHY for switch node (node-specific explanation)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 5,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details.rules_count).toBe(4);
        expect(mcpError.data?.details.explanation).toContain('Switch node');
        expect(mcpError.data?.details.explanation).toContain('4 rules');
        expect(mcpError.data?.details.explanation).toContain('typeVersion 3.4');
      }
    });

    test('error should include WHY for if node (node-specific explanation)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'If',
            to_node: 'Action1',
            from_output: 2,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details.explanation).toContain('If nodes');
        expect(mcpError.data?.details.explanation).toContain('exactly 2 outputs');
        expect(mcpError.data?.details.explanation).toContain('[0] = true');
        expect(mcpError.data?.details.explanation).toContain('[1] = false');
      }
    });

    test('error should include HOW (fix example with executable code)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details.fix).toMatchObject({
          action: expect.stringContaining('Change from_output'),
          parameter: 'from_output',
          current_value: 4,
          suggested_value: 3,
        });
        expect(mcpError.data?.details.fix.example).toContain('builder_connect');
        expect(mcpError.data?.details.fix.example).toContain('from_output: 3');
      }
    });

    test('error should include CONTEXT (existing connections)', async () => {
      // Add an existing connection
      const sessionWithConnection = {
        ...baseSession,
        workflow_draft: {
          ...baseSession.workflow_draft,
          connections: [
            {
              from_node: 'Switch',
              to_node: 'Action1',
              from_output: 0,
              to_input: 0,
            },
          ],
        },
      };
      mockStore.get.mockResolvedValue(sessionWithConnection);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action2',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details.existing_connections).toBeDefined();
        expect(mcpError.data?.details.existing_connections).toHaveLength(1);
        expect(mcpError.data?.details.existing_connections[0]).toMatchObject({
          to_node: 'Action1',
          from_output: 0,
          valid: true,
          status: '✅',
        });
      }
    });

    test('error should include REFERENCE (documentation link)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details.reference).toContain('node-quirks.yaml');
      }
    });
  });

  describe('Error Detection Timing (Early vs Late)', () => {
    test('P0-1: Error caught IMMEDIATELY at builder_connect (not at commit)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const startTime = Date.now();

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
        fail('Should have thrown error');
      } catch (error) {
        const duration = Date.now() - startTime;
        // Should fail immediately (< 100ms), not at commit time
        expect(duration).toBeLessThan(100);
        expect(error).toBeInstanceOf(McpError);
      }
    });
  });

  describe('AI Self-Recovery Enablement', () => {
    test('error message structure enables AI to parse and fix', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4,
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        const details = mcpError.data?.details;

        // AI can extract:
        // 1. What went wrong
        expect(details.error).toContain('Output index 4 exceeds');

        // 2. What the valid range is
        expect(details.valid_range).toBe('0 to 3');

        // 3. What value to use
        expect(details.fix.suggested_value).toBe(3);

        // 4. Executable code to retry
        const fixExample = details.fix.example;
        expect(fixExample).toMatch(/builder_connect\({.*from_output: 3.*}\)/);

        // AI can now:
        // - Parse error.details.fix.suggested_value
        // - Retry with correct from_output value
        // - Self-recover without human intervention
      }
    });
  });

  describe('Real-World Error Scenarios', () => {
    test('scenario: trying to connect to non-existent "fallback" output on 4-rule switch', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      // Common mistake: assuming switch has N+1 outputs (fallback)
      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'Switch',
            to_node: 'Action1',
            from_output: 4, // Trying to use "fallback" that doesn't exist
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        // Error should explain typeVersion 3.4 behavior
        expect(mcpError.data?.details.explanation).toContain('typeVersion 3.4');
        expect(mcpError.data?.details.explanation).toContain('no separate fallback');
      }
    });

    test('scenario: connecting wrong if node output (swapped true/false)', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'If',
            to_node: 'Action1',
            from_output: 2, // Doesn't exist
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.data?.details.explanation).toContain('[0] = true');
        expect(mcpError.data?.details.explanation).toContain('[1] = false');
      }
    });
  });

  describe('Node Resolution', () => {
    test('should resolve node by name', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'Switch', // By name
          to_node: 'Action1',
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.success).toBe(true);
    });

    test('should resolve node by ID', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      const result = await builderConnect(
        {
          session_id: 'test-session-123',
          from_node: 'switch-1', // By ID
          to_node: 'action-1',
        },
        mockStore as jest.Mocked<McpSessionStore>
      );

      expect(result.success).toBe(true);
    });

    test('should throw helpful error when node not found', async () => {
      mockStore.get.mockResolvedValue(baseSession);

      try {
        await builderConnect(
          {
            session_id: 'test-session-123',
            from_node: 'NonExistentNode',
            to_node: 'Action1',
          },
          mockStore as jest.Mocked<McpSessionStore>
        );
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.message).toContain('not found');
        expect(mcpError.data?.details.available_nodes).toEqual(
          expect.arrayContaining(['Switch', 'If', 'Action1', 'Action2'])
        );
        expect(mcpError.data?.details.recovery_hint).toContain('builder_preview');
      }
    });
  });
});
