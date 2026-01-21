import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { executionDebug } from '../../../src/tools/execution-debug.js';
import { N8NClient } from '../../../src/services/n8n-client.js';
import type { N8NExecutionWithData } from '../../../src/types.js';

describe('execution_debug', () => {
  let mockClient: jest.Mocked<N8NClient>;

  beforeEach(() => {
    mockClient = {
      getExecution: jest.fn(),
    } as unknown as jest.Mocked<N8NClient>;
  });

  test('should get execution debug data with all fields', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-123',
      workflowId: 'wf-456',
      status: 'success',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00.000Z',
      stoppedAt: '2026-01-21T10:00:05.000Z',
      finished: true,
      data: {
        resultData: {
          runData: {
            'Webhook': [
              {
                startTime: 1705838400000,
                source: [],
                executionTime: 50,
                data: {
                  main: [
                    [
                      { json: { id: 1, name: 'Test' } },
                    ],
                  ],
                },
              },
            ],
            'PostgreSQL': [
              {
                startTime: 1705838400100,
                source: [],
                executionTime: 250,
                data: {
                  main: [
                    [
                      { json: { user_id: 1 } },
                    ],
                    [
                      { json: { count: 42 } },
                    ],
                  ],
                },
              },
            ],
            'Respond': [
              {
                startTime: 1705838400400,
                source: [],
                executionTime: 10,
                data: {
                  main: [
                    [
                      { json: { status: 'ok' } },
                    ],
                  ],
                },
              },
            ],
          },
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-123' });

    expect(result.execution_id).toBe('exec-123');
    expect(result.workflow_id).toBe('wf-456');
    expect(result.status).toBe('success');
    expect(result.duration_ms).toBe(5000);
    expect(result.nodes).toHaveLength(3);
    expect(result.meta).toBeDefined();

    expect(mockClient.getExecution).toHaveBeenCalledWith('exec-123', 'all');
  });

  test('should parse node execution details correctly', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-nodes',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      stoppedAt: '2026-01-21T10:00:01Z',
      finished: true,
      data: {
        resultData: {
          runData: {
            'Test Node': [
              {
                startTime: 1705838400000,
                source: [],
                executionTime: 123,
                data: {
                  main: [
                    [
                      { json: { input: 'data' } },
                      { json: { input2: 'data2' } },
                    ],
                  ],
                },
              },
            ],
          },
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-nodes' });

    expect(result.nodes[0]).toEqual({
      node_name: 'Test Node',
      executed: true,
      start_time: 1705838400000,
      execution_time_ms: 123,
      input_items_count: 2,
      output_items_count: 2,
      input_sample: { input: 'data' },
      output_sample: { input: 'data' },
      error: undefined,
    });
  });

  test('should handle node with error', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-error',
      workflowId: 'wf-1',
      status: 'error',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      stoppedAt: '2026-01-21T10:00:01Z',
      finished: true,
      data: {
        resultData: {
          runData: {
            'Error Node': [
              {
                startTime: 1705838400000,
                source: [],
                executionTime: 50,
                data: {
                  main: [[]],
                },
                error: {
                  message: 'Database connection failed',
                  stack: 'Error: Database connection failed\\n    at connect (db.ts:45)',
                },
              },
            ],
          },
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-error' });

    expect(result.status).toBe('error');
    expect(result.nodes[0].error).toEqual({
      message: 'Database connection failed',
      stack: 'Error: Database connection failed\\n    at connect (db.ts:45)',
    });
  });

  test('should handle execution without data', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-nodata',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      finished: false,
      data: {
        resultData: {
          runData: {},
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-nodata' });

    expect(result.nodes).toHaveLength(0);
    expect(result.status).toBe('running');
  });

  test('should handle running execution without stopped_at', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-running',
      workflowId: 'wf-1',
      mode: 'trigger',
      startedAt: '2026-01-21T10:00:00Z',
      finished: false,
      data: {
        resultData: {
          runData: {},
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-running' });

    expect(result.stopped_at).toBeUndefined();
    expect(result.duration_ms).toBeUndefined();
    expect(result.status).toBe('running');
  });

  test('should handle multiple runs per node (loops)', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-loops',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      stoppedAt: '2026-01-21T10:00:02Z',
      finished: true,
      data: {
        resultData: {
          runData: {
            'Loop Node': [
              // First iteration
              {
                startTime: 1705838400000,
                source: [],
                executionTime: 100,
                data: {
                  main: [[{ json: { iteration: 1 } }]],
                },
              },
              // Second iteration
              {
                startTime: 1705838400150,
                source: [],
                executionTime: 120,
                data: {
                  main: [[{ json: { iteration: 2 } }]],
                },
              },
              // Third iteration (last)
              {
                startTime: 1705838400300,
                source: [],
                executionTime: 130,
                data: {
                  main: [[{ json: { iteration: 3 } }]],
                },
              },
            ],
          },
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-loops' });

    // Should only include the last run
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].output_sample).toEqual({ iteration: 3 });
    expect(result.nodes[0].execution_time_ms).toBe(130);
  });

  test('should handle nodes with empty data arrays', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-empty',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      stoppedAt: '2026-01-21T10:00:01Z',
      finished: true,
      data: {
        resultData: {
          runData: {
            'Empty Node': [
              {
                startTime: 1705838400000,
                source: [],
                executionTime: 10,
                data: {
                  main: [[]],
                },
              },
            ],
          },
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-empty' });

    expect(result.nodes[0].input_items_count).toBe(0);
    expect(result.nodes[0].output_items_count).toBe(0);
    expect(result.nodes[0].input_sample).toBeUndefined();
    expect(result.nodes[0].output_sample).toBeUndefined();
  });

  test('should respect include_data parameter', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-result-only',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      stoppedAt: '2026-01-21T10:00:01Z',
      finished: true,
      data: {
        resultData: {
          runData: {},
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    await executionDebug(mockClient, {
      execution_id: 'exec-result-only',
      include_data: 'result',
    });

    expect(mockClient.getExecution).toHaveBeenCalledWith('exec-result-only', 'result');
  });

  test('should default to "all" for include_data', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-default',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      finished: true,
      data: {
        resultData: {
          runData: {},
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    await executionDebug(mockClient, { execution_id: 'exec-default' });

    expect(mockClient.getExecution).toHaveBeenCalledWith('exec-default', 'all');
  });

  test('should include execution metadata', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-meta',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      finished: true,
      data: {
        resultData: {
          runData: {},
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-meta' });

    expect(result.meta).toBeDefined();
    expect(result.meta.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.meta.timestamp).toBeDefined();
    expect(result.meta.tool_version).toBe('1.2.0');
  });

  test('should skip nodes with empty run arrays', async () => {
    const mockExecution: N8NExecutionWithData = {
      id: 'exec-skip',
      workflowId: 'wf-1',
      mode: 'manual',
      startedAt: '2026-01-21T10:00:00Z',
      stoppedAt: '2026-01-21T10:00:01Z',
      finished: true,
      data: {
        resultData: {
          runData: {
            'Valid Node': [
              {
                startTime: 1705838400000,
                source: [],
                executionTime: 50,
                data: {
                  main: [[{ json: { test: 'data' } }]],
                },
              },
            ],
            'Empty Runs Node': [],
          },
        },
      },
    };

    mockClient.getExecution.mockResolvedValue(mockExecution);

    const result = await executionDebug(mockClient, { execution_id: 'exec-skip' });

    // Should only include "Valid Node", skip "Empty Runs Node"
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].node_name).toBe('Valid Node');
  });
});
