import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { workflowCreate } from '../../../src/tools/workflow-create.js';
import { N8NClient } from '../../../src/services/n8n-client.js';
import { SIMPLE_WEBHOOK_WORKFLOW } from '../../fixtures/workflows.js';
import type { N8NWorkflow } from '../../../src/types.js';

describe('workflow_create', () => {
  let mockClient: jest.Mocked<N8NClient>;

  beforeEach(() => {
    mockClient = {
      createWorkflow: jest.fn(),
    } as unknown as jest.Mocked<N8NClient>;
  });

  test('should create workflow and return metadata', async () => {
    const mockResponse: N8NWorkflow = {
      id: 'wf-123',
      name: 'Simple Webhook Test',
      active: false,
      nodes: [
        { id: 'node-1', type: 'n8n-nodes-base.webhook', typeVersion: 2, name: 'Webhook', position: [250, 300], parameters: {} },
        { id: 'node-2', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, name: 'Respond', position: [450, 300], parameters: {} },
      ],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.createWorkflow.mockResolvedValue(mockResponse);

    const result = await workflowCreate(mockClient, {
      workflow: SIMPLE_WEBHOOK_WORKFLOW,
    });

    expect(result.workflow_id).toBe('wf-123');
    expect(result.name).toBe('Simple Webhook Test');
    expect(result.active).toBe(false);
    expect(result.nodes_count).toBe(2);
    expect(result.created_at).toBe('2026-01-20T10:00:00Z');
    expect(result.meta).toBeDefined();
  });

  test('should handle activation flag', async () => {
    const mockResponse: N8NWorkflow = {
      id: 'wf-456',
      name: 'Active Workflow',
      active: true,
      nodes: [],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.createWorkflow.mockResolvedValue(mockResponse);

    const result = await workflowCreate(mockClient, {
      workflow: { name: 'Active Workflow', steps: [{ type: 'manual' }] },
      activate: true,
    });

    expect(result.active).toBe(true);
    expect(mockClient.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
      })
    );
  });

  test('should resolve credentials', async () => {
    const workflowWithCred = {
      name: 'Workflow with Creds',
      steps: [
        { type: 'postgres', credential: 'prod-db', config: { operation: 'select' } },
      ],
    };

    const mockResponse: N8NWorkflow = {
      id: 'wf-789',
      name: 'Workflow with Creds',
      active: false,
      nodes: [
        {
          id: 'node-1',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2.6,
          name: 'Postgres',
          position: [250, 300],
          parameters: {},
          credentials: {
            postgresDb: {
              id: 'cred-12345',
              name: 'prod-db',
            },
          },
        },
      ],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.createWorkflow.mockResolvedValue(mockResponse);

    const result = await workflowCreate(mockClient, {
      workflow: workflowWithCred,
      credentials: { 'prod-db': 'cred-12345' },
    });

    expect(result.workflow_id).toBe('wf-789');
    const callArg = mockClient.createWorkflow.mock.calls[0][0];
    const postgresNode = callArg.nodes?.find((n: any) => n.type === 'n8n-nodes-base.postgres');
    expect(postgresNode?.credentials).toBeDefined();
  });

  test('should throw error on missing credential', async () => {
    const workflowWithCred = {
      name: 'Missing Cred Workflow',
      steps: [
        { type: 'postgres', credential: 'missing-db' },
      ],
    };

    await expect(
      workflowCreate(mockClient, {
        workflow: workflowWithCred,
      })
    ).rejects.toThrow();
  });

  test('should default to inactive workflow', async () => {
    const mockResponse: N8NWorkflow = {
      id: 'wf-default',
      name: 'Default',
      active: false,
      nodes: [],
      connections: {},
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-01-20T10:00:00Z',
    };

    mockClient.createWorkflow.mockResolvedValue(mockResponse);

    await workflowCreate(mockClient, {
      workflow: { name: 'Default', steps: [{ type: 'manual' }] },
    });

    expect(mockClient.createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
      })
    );
  });
});
