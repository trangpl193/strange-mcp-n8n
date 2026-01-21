import { ExecutionMetadata, createMetadataFromStart, createCursor, createInitialCursor, TransparentCursor } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NExecution } from '../types.js';

export interface ExecutionListInput {
  workflow_id?: string;
  status?: 'success' | 'error' | 'running' | 'waiting';
  limit?: number;
  cursor?: string;
}

export interface ExecutionSummary {
  id: string;
  workflow_id: string;
  status: string;
  mode: string;
  started_at: string;
  stopped_at?: string;
  duration_ms?: number;
  finished: boolean;
}

export interface ExecutionListOutput {
  executions: ExecutionSummary[];
  cursor: TransparentCursor;
  meta: ExecutionMetadata;
}

/**
 * List workflow executions with filtering
 */
export async function executionList(
  client: N8NClient,
  input: ExecutionListInput
): Promise<ExecutionListOutput> {
  const startTime = Date.now();

  // Call N8N API
  const response = await client.listExecutions({
    workflowId: input.workflow_id,
    status: input.status,
    limit: input.limit || 100,
    cursor: input.cursor,
  });

  // Transform to summary format
  const executions: ExecutionSummary[] = response.data.map((exec: N8NExecution) => {
    const started = new Date(exec.startedAt).getTime();
    const stopped = exec.stoppedAt ? new Date(exec.stoppedAt).getTime() : null;
    const duration = stopped ? stopped - started : null;

    return {
      id: exec.id,
      workflow_id: exec.workflowId,
      status: exec.status || (exec.finished ? 'success' : 'running'),
      mode: exec.mode,
      started_at: exec.startedAt,
      stopped_at: exec.stoppedAt,
      duration_ms: duration || undefined,
      finished: exec.finished,
    };
  });

  // Parse current offset from cursor (if exists)
  const currentOffset = input.cursor
    ? parseInt(Buffer.from(input.cursor, 'base64').toString('utf-8').split(':')[1] || '0', 10)
    : 0;

  // Create transparent cursor using mcp-core helper
  const cursor: TransparentCursor = input.cursor
    ? createCursor({
        token: response.nextCursor || null,
        offset: currentOffset,
        fetchedRows: executions.length,
        fetchSize: input.limit || 100,
      })
    : createInitialCursor(
        response.nextCursor || null,
        executions.length,
        input.limit || 100
      );

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    executions,
    cursor,
    meta,
  };
}
