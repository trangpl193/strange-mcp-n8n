import { ExecutionMetadata, createMetadataFromStart, createCursor, createInitialCursor, TransparentCursor } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NWorkflow } from '../types.js';

export interface WorkflowDiscoverInput {
  active?: boolean;
  tags?: string;
  name?: string;
  limit?: number;
  cursor?: string;
}

export interface WorkflowDiscoveryItem {
  id: string;
  name: string;
  active: boolean;
}

export interface WorkflowDiscoverOutput {
  workflows: WorkflowDiscoveryItem[];
  count: number;
  cursor: TransparentCursor;
  meta: ExecutionMetadata;
}

/**
 * Tier 1: Lightweight workflow discovery
 * Returns only id, name, active - for discovery without token overhead
 */
export async function workflowDiscover(
  client: N8NClient,
  input: WorkflowDiscoverInput
): Promise<WorkflowDiscoverOutput> {
  const startTime = Date.now();

  // Call N8N API
  const response = await client.listWorkflows({
    active: input.active,
    tags: input.tags,
    name: input.name,
    limit: input.limit || 100,
    cursor: input.cursor,
  });

  // Extract only minimal fields (Tier 1)
  const workflows: WorkflowDiscoveryItem[] = response.data.map((wf: N8NWorkflow) => ({
    id: wf.id,
    name: wf.name,
    active: wf.active,
  }));

  // Parse current offset from cursor (if exists)
  const currentOffset = input.cursor
    ? parseInt(Buffer.from(input.cursor, 'base64').toString('utf-8').split(':')[1] || '0', 10)
    : 0;

  // Create transparent cursor
  const cursor: TransparentCursor = input.cursor
    ? createCursor({
        token: response.nextCursor || null,
        offset: currentOffset,
        fetchedRows: workflows.length,
        fetchSize: input.limit || 100,
      })
    : createInitialCursor(
        response.nextCursor || null,
        workflows.length,
        input.limit || 100
      );

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.3.0');

  return {
    workflows,
    count: workflows.length,
    cursor,
    meta,
  };
}
