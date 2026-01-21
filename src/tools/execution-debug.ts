import { ExecutionMetadata, createMetadataFromStart } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NExecutionWithData } from '../types.js';

export interface ExecutionDebugInput {
  execution_id: string;
  include_data?: 'none' | 'result' | 'all';
}

export interface NodeExecutionDebug {
  node_name: string;
  executed: boolean;
  start_time?: number;
  execution_time_ms?: number;
  input_items_count?: number;
  output_items_count?: number;
  input_sample?: any;
  output_sample?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface ExecutionDebugOutput {
  execution_id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  stopped_at?: string;
  duration_ms?: number;
  nodes: NodeExecutionDebug[];
  meta: ExecutionMetadata;
}

/**
 * Get detailed execution debug information with node-level I/O
 */
export async function executionDebug(
  client: N8NClient,
  input: ExecutionDebugInput
): Promise<ExecutionDebugOutput> {
  const startTime = Date.now();

  // Get execution with data from N8N API
  const execution: N8NExecutionWithData = await client.getExecution(
    input.execution_id,
    input.include_data || 'all'
  );

  // Calculate duration
  const started = new Date(execution.startedAt).getTime();
  const stopped = execution.stoppedAt ? new Date(execution.stoppedAt).getTime() : null;
  const duration = stopped ? stopped - started : null;

  // Extract node execution details
  const nodes: NodeExecutionDebug[] = [];
  const runData = execution.data?.resultData?.runData || {};

  Object.entries(runData).forEach(([nodeName, nodeRuns]) => {
    // Each node can have multiple runs (e.g., in loops)
    // We'll show the last run for simplicity
    const lastRun = nodeRuns[nodeRuns.length - 1];

    if (!lastRun) return;

    const inputData = lastRun.data?.main?.[0] || [];
    const outputData = lastRun.data?.main?.[0] || [];

    nodes.push({
      node_name: nodeName,
      executed: true,
      start_time: lastRun.startTime,
      execution_time_ms: lastRun.executionTime,
      input_items_count: inputData.length,
      output_items_count: outputData.length,
      input_sample: inputData.length > 0 ? inputData[0].json : undefined,
      output_sample: outputData.length > 0 ? outputData[0].json : undefined,
      error: lastRun.error ? {
        message: lastRun.error.message,
        stack: lastRun.error.stack,
      } : undefined,
    });
  });

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    execution_id: execution.id,
    workflow_id: execution.workflowId,
    status: execution.status || (execution.finished ? 'success' : 'running'),
    started_at: execution.startedAt,
    stopped_at: execution.stoppedAt,
    duration_ms: duration || undefined,
    nodes,
    meta,
  };
}
