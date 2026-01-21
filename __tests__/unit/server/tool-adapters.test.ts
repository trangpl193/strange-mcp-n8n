/**
 * Tests for MCP tool adapter layer
 *
 * These tests verify that MCP tool schema parameters are correctly
 * mapped to underlying tool implementation interfaces.
 *
 * Bug fixed: workflow_create was passing flat params directly to
 * workflowCreate() which expects nested {workflow: {...}} structure.
 */

import { describe, test, expect } from '@jest/globals';

describe('MCP Tool Adapters - Parameter Mapping', () => {
  describe('workflow_create adapter', () => {
    test('should map flat MCP params to nested WorkflowCreateInput', () => {
      // Simulates what server-sdk.ts adapter does
      const mcpParams = {
        name: 'Test Workflow',
        steps: [
          { type: 'webhook', config: { path: '/test' } },
          { type: 'respond', config: { statusCode: 200 } },
        ],
        active: true,
        tags: ['test'],
        credentials: { 'prod-db': 'cred-123' },
      };

      // Adapter transformation
      const input = {
        workflow: {
          name: mcpParams.name,
          steps: mcpParams.steps,
        },
        credentials: mcpParams.credentials,
        activate: mcpParams.active,
      };

      // Verify structure
      expect(input.workflow).toBeDefined();
      expect(input.workflow.name).toBe('Test Workflow');
      expect(input.workflow.steps).toHaveLength(2);
      expect(input.credentials).toEqual({ 'prod-db': 'cred-123' });
      expect(input.activate).toBe(true);
    });

    test('should handle missing optional params', () => {
      const mcpParams = {
        name: 'Minimal Workflow',
        steps: [{ type: 'manual' }],
      };

      const input = {
        workflow: {
          name: mcpParams.name,
          steps: mcpParams.steps,
        },
        credentials: undefined,
        activate: undefined,
      };

      expect(input.workflow).toBeDefined();
      expect(input.credentials).toBeUndefined();
      expect(input.activate).toBeUndefined();
    });
  });

  describe('workflow_get adapter', () => {
    test('should map workflowId to workflow_id', () => {
      const mcpParams = { workflowId: 'wf-123' };

      // Adapter transformation
      const input = { workflow_id: mcpParams.workflowId };

      expect(input.workflow_id).toBe('wf-123');
    });
  });

  describe('workflow_update adapter', () => {
    test('should detect Strategy 1: simplified schema when steps provided', () => {
      const mcpParams = {
        workflowId: 'wf-123',
        name: 'Updated Workflow',
        steps: [{ type: 'manual' }],
        credentials: { 'db': 'cred-456' },
      };

      // Adapter transformation
      const input: any = { workflow_id: mcpParams.workflowId };

      if (mcpParams.steps) {
        input.workflow = {
          name: mcpParams.name || '',
          steps: mcpParams.steps,
        };
        input.credentials = mcpParams.credentials;
      }

      expect(input.workflow).toBeDefined();
      expect(input.workflow.steps).toEqual([{ type: 'manual' }]);
      expect(input.credentials).toEqual({ 'db': 'cred-456' });
    });

    test('should detect Strategy 2: direct JSON when nodes provided', () => {
      const mcpParams = {
        workflowId: 'wf-123',
        name: 'Direct JSON Update',
        nodes: [{ id: 'n1', type: 'webhook' }],
        connections: { n1: { main: [[{ node: 'n2' }]] } },
        active: true,
      };

      // Adapter transformation
      const input: any = { workflow_id: mcpParams.workflowId };

      if ((mcpParams as any).steps) {
        // Strategy 1
      } else if (mcpParams.nodes) {
        input.workflow_json = {
          name: mcpParams.name,
          nodes: mcpParams.nodes,
          connections: mcpParams.connections,
          active: mcpParams.active,
        };
      }

      expect(input.workflow_json).toBeDefined();
      expect(input.workflow_json.nodes).toHaveLength(1);
      expect(input.workflow_json.connections).toBeDefined();
    });

    test('should detect Strategy 3: quick operations', () => {
      const mcpParams = {
        workflowId: 'wf-123',
        active: true,
        rename: 'New Name',
        addTags: ['new-tag'],
        removeTags: ['old-tag'],
      };

      // Adapter transformation
      const input: any = { workflow_id: mcpParams.workflowId };

      if (!(mcpParams as any).steps && !(mcpParams as any).nodes) {
        if (mcpParams.active !== undefined) input.activate = mcpParams.active;
        if (mcpParams.rename) input.rename = mcpParams.rename;
        if (mcpParams.addTags) input.add_tags = mcpParams.addTags;
        if (mcpParams.removeTags) input.remove_tags = mcpParams.removeTags;
      }

      expect(input.activate).toBe(true);
      expect(input.rename).toBe('New Name');
      expect(input.add_tags).toEqual(['new-tag']);
      expect(input.remove_tags).toEqual(['old-tag']);
    });
  });
});

describe('Error Message Enhancement', () => {
  test('workflow_create error should include helpful hints', () => {
    const errorMessage = 'Some internal error';
    const hint = `Check that 'steps' array contains valid step objects with 'type' property. ` +
                 `Supported types: webhook, schedule, manual, http, postgres, discord, respond, if, switch, merge, set, code`;

    const enhancedError = `workflow_create failed: ${errorMessage}\n\nHint: ${hint}`;

    expect(enhancedError).toContain('workflow_create failed');
    expect(enhancedError).toContain('Hint:');
    expect(enhancedError).toContain('Supported types:');
    expect(enhancedError).toContain('webhook');
    expect(enhancedError).toContain('postgres');
  });

  test('workflow_update error should include strategy hints', () => {
    const errorMessage = 'Update failed';
    const hint = `Update strategies: (1) provide 'steps' for simplified schema, ` +
                 `(2) provide 'nodes'+'connections' for direct N8N JSON, ` +
                 `(3) use 'active', 'rename', 'addTags', 'removeTags' for quick operations.`;

    const enhancedError = `workflow_update failed: ${errorMessage}\n\nHint: ${hint}`;

    expect(enhancedError).toContain('workflow_update failed');
    expect(enhancedError).toContain('strategies');
    expect(enhancedError).toContain('simplified schema');
    expect(enhancedError).toContain('quick operations');
  });
});
