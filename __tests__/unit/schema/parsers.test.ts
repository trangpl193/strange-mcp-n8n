import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  parseWorkflowCreateInput,
  parseWorkflowUpdateInput,
  parseNodeUpdateInput,
  parseBuilderStartInput,
  parseBuilderAddNodeInput,
  parseSimpleInput,
} from '../../../src/schema/parsers.js';

/**
 * Tests for schema/parsers.ts
 *
 * The parsers module uses parseToolInput from mcp-core schema transformer,
 * which expects canonical format (not flattened) as input.
 *
 * These tests verify that parsers correctly:
 * 1. Extract and type-cast fields from parsed input
 * 2. Handle missing optional fields
 * 3. Preserve nested object structures
 */

describe('schema/parsers', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Set default API target to Gemini for consistent test behavior
    process.env.MCP_TARGET_API = 'gemini';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseWorkflowCreateInput()', () => {
    test('should parse minimal workflow_create input', () => {
      const input = {
        name: 'Test Workflow',
        steps: [{ type: 'webhook', config: { path: '/test' } }],
      };

      const result = parseWorkflowCreateInput(input);

      expect(result).toEqual({
        name: 'Test Workflow',
        steps: [{ type: 'webhook', config: { path: '/test' } }],
        active: undefined,
        tags: undefined,
        credentials: undefined,
      });
    });

    test('should parse full workflow_create input with all fields', () => {
      const input = {
        name: 'Full Workflow',
        steps: [
          { type: 'webhook', config: { path: '/test' } },
          { type: 'postgres', action: 'query', config: { query: 'SELECT 1' } },
        ],
        active: true,
        tags: ['production', 'backup'],
        credentials: { postgres: 'cred-123' },
      };

      const result = parseWorkflowCreateInput(input);

      expect(result).toEqual({
        name: 'Full Workflow',
        steps: [
          { type: 'webhook', config: { path: '/test' } },
          { type: 'postgres', action: 'query', config: { query: 'SELECT 1' } },
        ],
        active: true,
        tags: ['production', 'backup'],
        credentials: { postgres: 'cred-123' },
      });
    });

    test('should handle empty steps array', () => {
      const input = {
        name: 'Empty Workflow',
        steps: [],
      };

      const result = parseWorkflowCreateInput(input);

      expect(result.steps).toEqual([]);
    });

    test('should handle complex step configurations', () => {
      const input = {
        name: 'Complex Workflow',
        steps: [
          {
            type: 'if',
            config: {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '={{ $json.field }}',
                    rightValue: 'value',
                    operator: { type: 'string', operation: 'equals' },
                  },
                ],
              },
            },
          },
        ],
      };

      const result = parseWorkflowCreateInput(input);

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]).toHaveProperty('type', 'if');
    });

    test('should handle missing optional fields', () => {
      const input = {
        name: 'Minimal',
        steps: [],
      };

      const result = parseWorkflowCreateInput(input);

      expect(result.active).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.credentials).toBeUndefined();
    });
  });

  describe('parseWorkflowUpdateInput()', () => {
    test('should parse minimal workflow_update input', () => {
      const input = {
        workflowId: 'wf-123',
      };

      const result = parseWorkflowUpdateInput(input);

      expect(result).toEqual({
        workflowId: 'wf-123',
        name: undefined,
        steps: undefined,
        nodes: undefined,
        connections: undefined,
        credentials: undefined,
        active: undefined,
        rename: undefined,
        addTags: undefined,
        removeTags: undefined,
      });
    });

    test('should parse workflow_update with steps', () => {
      const input = {
        workflowId: 'wf-123',
        steps: [{ type: 'webhook', config: { path: '/updated' } }],
      };

      const result = parseWorkflowUpdateInput(input);

      expect(result.workflowId).toBe('wf-123');
      expect(result.steps).toEqual([
        { type: 'webhook', config: { path: '/updated' } },
      ]);
    });

    test('should parse workflow_update with direct N8N format (nodes + connections)', () => {
      const input = {
        workflowId: 'wf-123',
        nodes: [
          {
            id: 'node-1',
            type: 'n8n-nodes-base.webhook',
            name: 'Webhook',
            parameters: {},
          },
        ],
        connections: {
          Webhook: { main: [[{ node: 'Postgres', type: 'main', index: 0 }]] },
        },
      };

      const result = parseWorkflowUpdateInput(input);

      expect(result.nodes).toHaveLength(1);
      expect(result.connections).toHaveProperty('Webhook');
    });

    test('should parse workflow_update with quick operations', () => {
      const input = {
        workflowId: 'wf-123',
        rename: 'New Name',
        active: false,
        addTags: ['tag1', 'tag2'],
        removeTags: ['oldtag'],
      };

      const result = parseWorkflowUpdateInput(input);

      expect(result.workflowId).toBe('wf-123');
      expect(result.rename).toBe('New Name');
      expect(result.active).toBe(false);
      expect(result.addTags).toEqual(['tag1', 'tag2']);
      expect(result.removeTags).toEqual(['oldtag']);
    });

    test('should handle credentials update', () => {
      const input = {
        workflowId: 'wf-123',
        credentials: {
          postgres: 'cred-new',
          discord: 'cred-discord'
        },
      };

      const result = parseWorkflowUpdateInput(input);

      expect(result.credentials).toEqual({
        postgres: 'cred-new',
        discord: 'cred-discord',
      });
    });
  });

  describe('parseNodeUpdateInput()', () => {
    test('should parse minimal node_update input', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
      };

      const result = parseNodeUpdateInput(input);

      expect(result).toEqual({
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
        name: undefined,
        parameters: undefined,
        position: undefined,
        disabled: undefined,
      });
    });

    test('should parse node_update with name change', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
        name: 'Webhook Updated',
      };

      const result = parseNodeUpdateInput(input);

      expect(result.name).toBe('Webhook Updated');
    });

    test('should parse node_update with parameters', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Postgres',
        parameters: {
          query: 'SELECT * FROM users',
          operation: 'executeQuery',
        },
      };

      const result = parseNodeUpdateInput(input);

      expect(result.parameters).toEqual({
        query: 'SELECT * FROM users',
        operation: 'executeQuery',
      });
    });

    test('should parse node_update with position tuple', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
        position: [250, 300] as [number, number],
      };

      const result = parseNodeUpdateInput(input);

      expect(result.position).toEqual([250, 300]);
    });

    test('should parse node_update with disabled state', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
        disabled: true,
      };

      const result = parseNodeUpdateInput(input);

      expect(result.disabled).toBe(true);
    });

    test('should parse node_update with all fields', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
        name: 'New Webhook',
        parameters: { path: '/new' },
        position: [100, 200] as [number, number],
        disabled: false,
      };

      const result = parseNodeUpdateInput(input);

      expect(result).toEqual({
        workflowId: 'wf-123',
        nodeIdentifier: 'Webhook',
        name: 'New Webhook',
        parameters: { path: '/new' },
        position: [100, 200],
        disabled: false,
      });
    });
  });

  describe('parseBuilderStartInput()', () => {
    test('should parse minimal builder_start input', () => {
      const input = {
        name: 'New Workflow',
      };

      const result = parseBuilderStartInput(input);

      expect(result).toEqual({
        name: 'New Workflow',
        description: undefined,
        credentials: undefined,
      });
    });

    test('should parse builder_start with description', () => {
      const input = {
        name: 'New Workflow',
        description: 'This workflow handles webhooks',
      };

      const result = parseBuilderStartInput(input);

      expect(result.description).toBe('This workflow handles webhooks');
    });

    test('should parse builder_start with credentials', () => {
      const input = {
        name: 'New Workflow',
        credentials: {
          postgres: 'cred-pg',
          discord: 'cred-dc',
        },
      };

      const result = parseBuilderStartInput(input);

      expect(result.credentials).toEqual({
        postgres: 'cred-pg',
        discord: 'cred-dc',
      });
    });

    test('should parse builder_start with all fields', () => {
      const input = {
        name: 'Complete Workflow',
        description: 'Full description',
        credentials: { http: 'cred-http' },
      };

      const result = parseBuilderStartInput(input);

      expect(result).toEqual({
        name: 'Complete Workflow',
        description: 'Full description',
        credentials: { http: 'cred-http' },
      });
    });
  });

  describe('parseBuilderAddNodeInput()', () => {
    test('should parse minimal builder_add_node input', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'webhook',
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.sessionId).toBe('session-123');
      expect(result.node).toHaveProperty('type', 'webhook');
    });

    test('should parse builder_add_node with node name', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'webhook',
          name: 'My Webhook',
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node).toHaveProperty('name', 'My Webhook');
    });

    test('should parse builder_add_node with action', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'postgres',
          action: 'query',
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node).toHaveProperty('action', 'query');
    });

    test('should parse builder_add_node with config', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'postgres',
          action: 'query',
          config: {
            query: 'SELECT * FROM users',
            operation: 'executeQuery',
          },
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node.config).toEqual({
        query: 'SELECT * FROM users',
        operation: 'executeQuery',
      });
    });

    test('should parse builder_add_node with credential', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'postgres',
          credential: 'postgres',
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node).toHaveProperty('credential', 'postgres');
    });

    test('should parse builder_add_node with position', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'webhook',
          position: [150, 250] as [number, number],
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node.position).toEqual([150, 250]);
    });

    test('should parse builder_add_node with all fields', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'postgres',
          name: 'Database Query',
          action: 'query',
          config: { query: 'SELECT 1' },
          credential: 'postgres',
          position: [300, 400] as [number, number],
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result).toEqual({
        sessionId: 'session-123',
        node: {
          type: 'postgres',
          name: 'Database Query',
          action: 'query',
          config: { query: 'SELECT 1' },
          credential: 'postgres',
          position: [300, 400],
        },
      });
    });
  });

  describe('parseSimpleInput()', () => {
    test('should parse simple tool input without transformation', () => {
      const input = {
        workflowId: 'wf-123',
        executionId: 'exec-456',
      };

      const result = parseSimpleInput<typeof input>('execution_debug', input);

      // parseSimpleInput just passes through parseToolInput
      expect(result).toHaveProperty('workflowId');
      expect(result).toHaveProperty('executionId');
    });

    test('should preserve type information', () => {
      interface TestInput {
        id: string;
        count: number;
        active: boolean;
      }

      const input = {
        id: 'test-123',
        count: 42,
        active: true,
      };

      const result = parseSimpleInput<TestInput>('test_tool', input);

      expect(result.id).toBe('test-123');
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty credentials object', () => {
      const input = {
        name: 'Test',
        steps: [],
        credentials: {},
      };

      const result = parseWorkflowCreateInput(input);

      expect(result.credentials).toEqual({});
    });

    test('should handle zero position coordinates', () => {
      const input = {
        workflowId: 'wf-123',
        nodeIdentifier: 'Node',
        position: [0, 0] as [number, number],
      };

      const result = parseNodeUpdateInput(input);

      expect(result.position).toEqual([0, 0]);
    });

    test('should handle negative position coordinates', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'webhook',
          position: [-100, -200] as [number, number],
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node.position).toEqual([-100, -200]);
    });

    test('should handle very long workflow names', () => {
      const longName = 'a'.repeat(1000);
      const input = {
        name: longName,
        steps: [],
      };

      const result = parseWorkflowCreateInput(input);

      expect(result.name).toHaveLength(1000);
    });

    test('should handle deeply nested configuration objects', () => {
      const input = {
        sessionId: 'session-123',
        node: {
          type: 'code',
          config: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    value: 'deep',
                  },
                },
              },
            },
          },
        },
      };

      const result = parseBuilderAddNodeInput(input);

      expect(result.node.config).toHaveProperty('level1');
      const level1 = (result.node.config as any).level1;
      expect(level1.level2.level3.level4.value).toBe('deep');
    });

    test('should handle undefined for all optional fields', () => {
      const input = {
        workflowId: 'wf-123',
      };

      const result = parseWorkflowUpdateInput(input);

      expect(result.name).toBeUndefined();
      expect(result.steps).toBeUndefined();
      expect(result.nodes).toBeUndefined();
      expect(result.connections).toBeUndefined();
      expect(result.credentials).toBeUndefined();
      expect(result.active).toBeUndefined();
      expect(result.rename).toBeUndefined();
      expect(result.addTags).toBeUndefined();
      expect(result.removeTags).toBeUndefined();
    });
  });
});
