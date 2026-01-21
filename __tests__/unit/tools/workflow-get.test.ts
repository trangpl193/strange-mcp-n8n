import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { workflowGet } from '../../../src/tools/workflow-get.js';
import { N8NClient } from '../../../src/services/n8n-client.js';
import type { N8NWorkflow } from '../../../src/types.js';

describe('workflow_get', () => {
  let mockClient: jest.Mocked<N8NClient>;

  beforeEach(() => {
    mockClient = {
      getWorkflow: jest.fn(),
    } as unknown as jest.Mocked<N8NClient>;
  });

  test('should get workflow details with all fields', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-123',
      name: 'Test Workflow',
      active: true,
      tags: ['production', 'critical'],
      nodes: [
        {
          id: 'node-1',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          name: 'Webhook',
          position: [250, 300],
          parameters: {
            path: '/test',
            httpMethod: 'POST',
          },
        },
        {
          id: 'node-2',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2.6,
          name: 'PostgreSQL',
          position: [450, 300],
          parameters: {
            operation: 'select',
            table: 'users',
          },
          credentials: {
            postgresDb: {
              id: 'cred-123',
              name: 'prod-db',
            },
          },
        },
        {
          id: 'node-3',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1.1,
          name: 'Respond',
          position: [650, 300],
          parameters: {
            statusCode: 200,
          },
        },
      ],
      connections: {
        'Webhook': {
          main: [
            [
              { node: 'PostgreSQL', type: 'main', index: 0 },
            ],
          ],
        },
        'PostgreSQL': {
          main: [
            [
              { node: 'Respond', type: 'main', index: 0 },
            ],
          ],
        },
      },
      settings: {
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
      },
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T15:30:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-123' });

    expect(result.id).toBe('wf-123');
    expect(result.name).toBe('Test Workflow');
    expect(result.active).toBe(true);
    expect(result.tags).toEqual(['production', 'critical']);
    expect(result.nodes).toHaveLength(3);
    expect(result.connections).toHaveLength(2);
    expect(result.settings).toEqual({
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
    });
    expect(result.created_at).toBe('2026-01-20T10:00:00Z');
    expect(result.updated_at).toBe('2026-01-20T15:30:00Z');
    expect(result.meta).toBeDefined();
  });

  test('should transform nodes correctly', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-nodes',
      name: 'Node Test',
      active: false,
      nodes: [
        {
          id: 'n1',
          type: 'n8n-nodes-base.manual',
          typeVersion: 1,
          name: 'Manual Trigger',
          position: [100, 200],
          parameters: {},
        },
        {
          id: 'n2',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          name: 'Code Node',
          position: [300, 200],
          parameters: {
            mode: 'runOnceForAllItems',
            jsCode: 'return items;',
          },
        },
      ],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-nodes' });

    expect(result.nodes[0]).toEqual({
      id: 'n1',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manual',
      type_version: 1,
      position: [100, 200],
      parameters: {},
      credentials: undefined,
    });

    expect(result.nodes[1]).toEqual({
      id: 'n2',
      name: 'Code Node',
      type: 'n8n-nodes-base.code',
      type_version: 2,
      position: [300, 200],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: 'return items;',
      },
      credentials: undefined,
    });
  });

  test('should transform connections correctly', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-connections',
      name: 'Connection Test',
      active: false,
      nodes: [
        { id: 'A', type: 'n8n-nodes-base.manual', typeVersion: 1, name: 'A', position: [0, 0], parameters: {} },
        { id: 'B', type: 'n8n-nodes-base.code', typeVersion: 2, name: 'B', position: [100, 0], parameters: {} },
        { id: 'C', type: 'n8n-nodes-base.code', typeVersion: 2, name: 'C', position: [200, 0], parameters: {} },
      ],
      connections: {
        'A': {
          main: [
            [
              { node: 'B', type: 'main', index: 0 },
              { node: 'C', type: 'main', index: 0 },
            ],
          ],
        },
      },
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-connections' });

    expect(result.connections).toHaveLength(2);
    expect(result.connections).toContainEqual({
      from: 'A',
      to: 'B',
      type: 'main',
    });
    expect(result.connections).toContainEqual({
      from: 'A',
      to: 'C',
      type: 'main',
    });
  });

  test('should handle workflows without tags', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-no-tags',
      name: 'No Tags',
      active: false,
      nodes: [],
      connections: {},
      // tags field missing
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-no-tags' });

    expect(result.tags).toEqual([]);
  });

  test('should handle workflows without settings', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-no-settings',
      name: 'No Settings',
      active: false,
      nodes: [],
      connections: {},
      // settings field missing
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-no-settings' });

    expect(result.settings).toEqual({});
  });

  test('should handle empty connections', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-empty-connections',
      name: 'Empty Connections',
      active: false,
      nodes: [
        { id: 'n1', type: 'n8n-nodes-base.manual', typeVersion: 1, name: 'Node 1', position: [0, 0], parameters: {} },
      ],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-empty-connections' });

    expect(result.connections).toEqual([]);
  });

  test('should include credentials in node details', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-creds',
      name: 'With Credentials',
      active: false,
      nodes: [
        {
          id: 'postgres-node',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2.6,
          name: 'PostgreSQL',
          position: [250, 300],
          parameters: { operation: 'select' },
          credentials: {
            postgresDb: {
              id: 'cred-abc',
              name: 'my-database',
            },
          },
        },
      ],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-creds' });

    expect(result.nodes[0].credentials).toEqual({
      postgresDb: {
        id: 'cred-abc',
        name: 'my-database',
      },
    });
  });

  test('should include execution metadata', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-meta',
      name: 'Metadata Test',
      active: false,
      nodes: [],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    const result = await workflowGet(mockClient, { workflow_id: 'wf-meta' });

    expect(result.meta).toBeDefined();
    expect(result.meta.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.meta.timestamp).toBeDefined();
    expect(result.meta.tool_version).toBe('1.2.0');
  });

  test('should call client with correct workflow ID', async () => {
    const mockWorkflow: N8NWorkflow = {
      id: 'wf-specific',
      name: 'Specific Workflow',
      active: false,
      nodes: [],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.getWorkflow.mockResolvedValue(mockWorkflow);

    await workflowGet(mockClient, { workflow_id: 'wf-specific' });

    expect(mockClient.getWorkflow).toHaveBeenCalledWith('wf-specific');
    expect(mockClient.getWorkflow).toHaveBeenCalledTimes(1);
  });
});
