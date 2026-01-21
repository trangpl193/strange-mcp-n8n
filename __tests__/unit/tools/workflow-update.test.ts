import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { workflowUpdate } from '../../../src/tools/workflow-update.js';
import { N8NClient } from '../../../src/services/n8n-client.js';
import type { N8NWorkflow } from '../../../src/types.js';
import { McpError } from '@strange/mcp-core';

describe('workflow_update', () => {
  let mockClient: jest.Mocked<N8NClient>;
  let currentWorkflow: N8NWorkflow;

  beforeEach(() => {
    mockClient = {
      getWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
    } as unknown as jest.Mocked<N8NClient>;

    currentWorkflow = {
      id: 'wf-123',
      name: 'Original Workflow',
      active: false,
      tags: ['test', 'dev'],
      nodes: [
        { id: 'n1', type: 'n8n-nodes-base.manual', typeVersion: 1, name: 'Manual', position: [0, 0], parameters: {} },
      ],
      connections: {},
      settings: { saveDataErrorExecution: 'all' },
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };
  });

  describe('Quick operations', () => {
    test('should activate workflow', async () => {
      const updatedWorkflow = { ...currentWorkflow, active: true, updatedAt: '2026-01-20T11:00:00Z' };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        activate: true,
      });

      expect(result.active).toBe(true);
      expect(mockClient.updateWorkflow).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({ active: true })
      );
    });

    test('should deactivate workflow', async () => {
      const activeWorkflow = { ...currentWorkflow, active: true };
      const updatedWorkflow = { ...currentWorkflow, active: false, updatedAt: '2026-01-20T11:00:00Z' };
      mockClient.getWorkflow.mockResolvedValue(activeWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        activate: false,
      });

      expect(result.active).toBe(false);
    });

    test('should rename workflow', async () => {
      const updatedWorkflow = { ...currentWorkflow, name: 'New Name', updatedAt: '2026-01-20T11:00:00Z' };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        rename: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(mockClient.updateWorkflow).toHaveBeenCalledWith(
        'wf-123',
        expect.objectContaining({ name: 'New Name' })
      );
    });

    test('should add tags', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        tags: ['test', 'dev', 'production'],
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        add_tags: ['production'],
      });

      const callArg = mockClient.updateWorkflow.mock.calls[0][1];
      expect(callArg.tags).toContain('production');
      expect(callArg.tags).toContain('test');
      expect(callArg.tags).toContain('dev');
    });

    test('should remove tags', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        tags: ['test'],
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        remove_tags: ['dev'],
      });

      const callArg = mockClient.updateWorkflow.mock.calls[0][1];
      expect(callArg.tags).not.toContain('dev');
      expect(callArg.tags).toContain('test');
    });

    test('should handle multiple quick operations', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        name: 'Updated Name',
        active: true,
        tags: ['test', 'production'],
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        rename: 'Updated Name',
        activate: true,
        add_tags: ['production'],
        remove_tags: ['dev'],
      });

      expect(result.name).toBe('Updated Name');
      expect(result.active).toBe(true);
      const callArg = mockClient.updateWorkflow.mock.calls[0][1];
      expect(callArg.tags).toContain('production');
      expect(callArg.tags).not.toContain('dev');
    });

    test('should avoid duplicate tags when adding', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        tags: ['test', 'dev'],
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        add_tags: ['test'], // Already exists
      });

      const callArg = mockClient.updateWorkflow.mock.calls[0][1];
      const testTags = callArg.tags?.filter(t => t === 'test');
      expect(testTags?.length).toBe(1); // No duplicates
    });
  });

  describe('Full replacement with simplified schema', () => {
    test('should update workflow with simplified schema', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        name: 'Updated via Schema',
        nodes: [
          { id: 'n1', type: 'n8n-nodes-base.webhook', typeVersion: 2, name: 'Webhook', position: [0, 0] as [number, number], parameters: {} },
          { id: 'n2', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, name: 'Respond', position: [100, 0] as [number, number], parameters: {} },
        ],
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        workflow: {
          name: 'Updated via Schema',
          steps: [
            { type: 'webhook', config: { path: '/test' } },
            { type: 'respond', config: { statusCode: 200 } },
          ],
        },
      });

      expect(result.name).toBe('Updated via Schema');
      expect(result.nodes_count).toBe(2);
    });

    test('should preserve tags when updating with simplified schema', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        tags: ['test', 'dev'], // Preserved
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        workflow: {
          name: 'Updated',
          steps: [{ type: 'manual' }],
        },
      });

      const callArg = mockClient.updateWorkflow.mock.calls[0][1];
      expect(callArg.tags).toEqual(['test', 'dev']);
    });
  });

  describe('Direct N8N JSON update', () => {
    test('should update with direct JSON', async () => {
      const updatedWorkflow = {
        ...currentWorkflow,
        active: true,
        settings: { saveDataErrorExecution: 'none' as const },
        updatedAt: '2026-01-20T11:00:00Z'
      };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        workflow_json: {
          active: true,
          settings: { saveDataErrorExecution: 'none' },
        },
      });

      expect(result.active).toBe(true);
    });
  });

  describe('Validation', () => {
    test('should throw error if workflow update has no name', async () => {
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);

      await expect(
        workflowUpdate(mockClient, {
          workflow_id: 'wf-123',
          workflow_json: {
            name: undefined as any,
            nodes: undefined as any,
          },
        })
      ).rejects.toThrow(McpError);
    });
  });

  describe('Metadata', () => {
    test('should include execution metadata', async () => {
      const updatedWorkflow = { ...currentWorkflow, updatedAt: '2026-01-20T11:00:00Z' };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        activate: true,
      });

      expect(result.meta).toBeDefined();
      expect(result.meta.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.tool_version).toBe('1.2.0');
    });

    test('should return updated_at timestamp', async () => {
      const updatedWorkflow = { ...currentWorkflow, updatedAt: '2026-01-20T15:30:00Z' };
      mockClient.getWorkflow.mockResolvedValue(currentWorkflow);
      mockClient.updateWorkflow.mockResolvedValue(updatedWorkflow);

      const result = await workflowUpdate(mockClient, {
        workflow_id: 'wf-123',
        rename: 'New Name',
      });

      expect(result.updated_at).toBe('2026-01-20T15:30:00Z');
    });
  });
});
