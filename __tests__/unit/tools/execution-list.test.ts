import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { executionList } from '../../../src/tools/execution-list.js';
import { N8NClient } from '../../../src/services/n8n-client.js';
import type { N8NExecution, N8NListResponse } from '../../../src/types.js';

describe('execution_list', () => {
  let mockClient: jest.Mocked<N8NClient>;

  beforeEach(() => {
    mockClient = {
      listExecutions: jest.fn(),
    } as unknown as jest.Mocked<N8NClient>;
  });

  test('should list executions with default limit', async () => {
    const mockExecutions: N8NExecution[] = [
      {
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'success',
        mode: 'manual',
        startedAt: '2026-01-21T10:00:00Z',
        stoppedAt: '2026-01-21T10:00:05Z',
        finished: true,
      },
      {
        id: 'exec-2',
        workflowId: 'wf-1',
        status: 'error',
        mode: 'trigger',
        startedAt: '2026-01-21T11:00:00Z',
        stoppedAt: '2026-01-21T11:00:02Z',
        finished: true,
      },
    ];

    const mockResponse: N8NListResponse<N8NExecution> = {
      data: mockExecutions,
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, {});

    expect(result.executions).toHaveLength(2);
    expect(result.executions[0]).toEqual({
      id: 'exec-1',
      workflow_id: 'wf-1',
      status: 'success',
      mode: 'manual',
      started_at: '2026-01-21T10:00:00Z',
      stopped_at: '2026-01-21T10:00:05Z',
      duration_ms: 5000,
      finished: true,
    });
    expect(result.cursor.has_more).toBe(false);
    expect(result.cursor.position.fetched_total).toBe(2);
    expect(result.cursor.position.offset).toBe(0);
    expect(result.meta).toBeDefined();
    expect(mockClient.listExecutions).toHaveBeenCalledWith({
      workflowId: undefined,
      status: undefined,
      limit: 100,
      cursor: undefined,
    });
  });

  test('should filter by workflow_id', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [
        {
          id: 'exec-wf1',
          workflowId: 'wf-specific',
          status: 'success',
          mode: 'manual',
          startedAt: '2026-01-21T10:00:00Z',
          stoppedAt: '2026-01-21T10:00:01Z',
          finished: true,
        },
      ],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    await executionList(mockClient, { workflow_id: 'wf-specific' });

    expect(mockClient.listExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-specific',
      })
    );
  });

  test('should filter by status', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    await executionList(mockClient, { status: 'error' });

    expect(mockClient.listExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
      })
    );
  });

  test('should respect custom limit', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    await executionList(mockClient, { limit: 50 });

    expect(mockClient.listExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
      })
    );
  });

  test('should handle pagination with cursor', async () => {
    const cursor = Buffer.from('nextpage:100', 'utf-8').toString('base64');
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [
        {
          id: 'exec-page2',
          workflowId: 'wf-1',
          status: 'success',
          mode: 'manual',
          startedAt: '2026-01-21T10:00:00Z',
          stoppedAt: '2026-01-21T10:00:01Z',
          finished: true,
        },
      ],
      nextCursor: 'nextpage:200',
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, { cursor });

    expect(result.cursor.token).toBe('nextpage:200');
    expect(result.cursor.has_more).toBe(true);
    expect(result.cursor.position.fetched_total).toBe(101); // 100 + 1
    expect(result.cursor.position.offset).toBe(100);
    expect(mockClient.listExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor,
      })
    );
  });

  test('should calculate duration correctly', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [
        {
          id: 'exec-duration',
          workflowId: 'wf-1',
          status: 'success',
          mode: 'manual',
          startedAt: '2026-01-21T10:00:00.000Z',
          stoppedAt: '2026-01-21T10:00:03.500Z',
          finished: true,
        },
      ],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, {});

    expect(result.executions[0].duration_ms).toBe(3500);
  });

  test('should handle running execution without stopped_at', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [
        {
          id: 'exec-running',
          workflowId: 'wf-1',
          mode: 'trigger',
          startedAt: '2026-01-21T10:00:00Z',
          finished: false,
        },
      ],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, {});

    expect(result.executions[0].status).toBe('running');
    expect(result.executions[0].stopped_at).toBeUndefined();
    expect(result.executions[0].duration_ms).toBeUndefined();
    expect(result.executions[0].finished).toBe(false);
  });

  test('should use status from API when available', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [
        {
          id: 'exec-waiting',
          workflowId: 'wf-1',
          status: 'waiting',
          mode: 'manual',
          startedAt: '2026-01-21T10:00:00Z',
          finished: false,
        },
      ],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, {});

    expect(result.executions[0].status).toBe('waiting');
  });

  test('should handle empty results', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, {});

    expect(result.executions).toHaveLength(0);
    expect(result.cursor.has_more).toBe(false);
    expect(result.cursor.position.fetched_total).toBe(0);
  });

  test('should include execution metadata', async () => {
    const mockResponse: N8NListResponse<N8NExecution> = {
      data: [],
      nextCursor: undefined,
    };

    mockClient.listExecutions.mockResolvedValue(mockResponse);

    const result = await executionList(mockClient, {});

    expect(result.meta).toBeDefined();
    expect(result.meta.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.meta.timestamp).toBeDefined();
    expect(result.meta.tool_version).toBe('1.2.0');
  });
});
