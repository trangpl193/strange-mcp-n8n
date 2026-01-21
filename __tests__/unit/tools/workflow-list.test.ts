import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { workflowList } from '../../../src/tools/workflow-list.js';
import { N8NClient } from '../../../src/services/n8n-client.js';
import type { N8NWorkflow, N8NListResponse } from '../../../src/types.js';

describe('workflow_list', () => {
  let mockClient: jest.Mocked<N8NClient>;

  beforeEach(() => {
    mockClient = {
      listWorkflows: jest.fn(),
    } as unknown as jest.Mocked<N8NClient>;
  });

  test('should list workflows with default limit', async () => {
    const mockWorkflows: N8NWorkflow[] = [
      {
        id: 'wf-1',
        name: 'Test Workflow 1',
        active: true,
        nodes: [
          { id: 'n1', type: 'n8n-nodes-base.webhook', typeVersion: 2, name: 'Webhook', position: [0, 0], parameters: {} },
        ],
        connections: {},
        tags: ['test'],
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      },
      {
        id: 'wf-2',
        name: 'Test Workflow 2',
        active: false,
        nodes: [
          { id: 'n2', type: 'n8n-nodes-base.manual', typeVersion: 1, name: 'Manual', position: [0, 0], parameters: {} },
          { id: 'n3', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, name: 'Respond', position: [100, 0], parameters: {} },
        ],
        connections: {},
        tags: ['production'],
        createdAt: '2026-01-20T11:00:00Z',
        updatedAt: '2026-01-20T11:00:00Z',
      },
    ];

    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: mockWorkflows,
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    const result = await workflowList(mockClient, {});

    expect(result.workflows).toHaveLength(2);
    expect(result.workflows[0]).toEqual({
      id: 'wf-1',
      name: 'Test Workflow 1',
      active: true,
      tags: ['test'],
      nodes_count: 1,
      created_at: '2026-01-20T10:00:00Z',
      updated_at: '2026-01-20T10:00:00Z',
    });
    expect(result.workflows[1]).toEqual({
      id: 'wf-2',
      name: 'Test Workflow 2',
      active: false,
      tags: ['production'],
      nodes_count: 2,
      created_at: '2026-01-20T11:00:00Z',
      updated_at: '2026-01-20T11:00:00Z',
    });
    expect(result.cursor.has_more).toBe(false);
    expect(result.cursor.position.fetched_total).toBe(2);
    expect(result.cursor.position.offset).toBe(0);
    expect(result.cursor.position.fetch_size).toBe(100);
    expect(result.meta).toBeDefined();
    expect(mockClient.listWorkflows).toHaveBeenCalledWith({
      limit: 100,
      active: undefined,
      tags: undefined,
      name: undefined,
      cursor: undefined,
    });
  });

  test('should filter by active status', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [
        {
          id: 'wf-active',
          name: 'Active Only',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-20T10:00:00Z',
        },
      ],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    await workflowList(mockClient, { active: true });

    expect(mockClient.listWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
      })
    );
  });

  test('should filter by tags', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    await workflowList(mockClient, { tags: 'production,critical' });

    expect(mockClient.listWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: 'production,critical',
      })
    );
  });

  test('should filter by name', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    await workflowList(mockClient, { name: 'Test' });

    expect(mockClient.listWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test',
      })
    );
  });

  test('should respect custom limit', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    await workflowList(mockClient, { limit: 50 });

    expect(mockClient.listWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
      })
    );
  });

  test('should handle pagination with cursor', async () => {
    const cursor = Buffer.from('nextpage:100', 'utf-8').toString('base64');
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [
        {
          id: 'wf-page2',
          name: 'Page 2 Workflow',
          active: false,
          nodes: [],
          connections: {},
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-20T10:00:00Z',
        },
      ],
      nextCursor: 'nextpage:200',
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    const result = await workflowList(mockClient, { cursor });

    expect(result.cursor.token).toBe('nextpage:200');
    expect(result.cursor.has_more).toBe(true);
    expect(result.cursor.position.fetched_total).toBe(101); // 100 + 1 workflow
    expect(result.cursor.position.offset).toBe(100);
    expect(mockClient.listWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor,
      })
    );
  });

  test('should handle empty results', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    const result = await workflowList(mockClient, {});

    expect(result.workflows).toHaveLength(0);
    expect(result.cursor.has_more).toBe(false);
    expect(result.cursor.position.fetched_total).toBe(0);
  });

  test('should handle workflows without tags', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [
        {
          id: 'wf-no-tags',
          name: 'No Tags Workflow',
          active: false,
          nodes: [],
          connections: {},
          // tags field missing
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-20T10:00:00Z',
        } as N8NWorkflow,
      ],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    const result = await workflowList(mockClient, {});

    expect(result.workflows[0].tags).toEqual([]);
  });

  test('should include execution metadata', async () => {
    const mockResponse: N8NListResponse<N8NWorkflow> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listWorkflows.mockResolvedValue(mockResponse);

    const result = await workflowList(mockClient, {});

    expect(result.meta).toBeDefined();
    expect(result.meta.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.meta.timestamp).toBeDefined();
    expect(result.meta.tool_version).toBe('1.2.0');
  });
});
