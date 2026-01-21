import { ExecutionMetadata, TransparentCursor, createMetadataFromStart } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NWorkflow } from '../types.js';

export interface WorkflowListInput {
  active?: boolean;
  tags?: string;
  name?: string;
  limit?: number;
  cursor?: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  nodes_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListOutput {
  workflows: WorkflowSummary[];
  cursor: TransparentCursor;
  meta: ExecutionMetadata;
}

/**
 * List workflows with filtering
 */
export async function workflowList(
  client: N8NClient,
  input: WorkflowListInput
): Promise<WorkflowListOutput> {
  const startTime = Date.now();

  // Call N8N API
  const response = await client.listWorkflows({
    active: input.active,
    tags: input.tags,
    name: input.name,
    limit: input.limit || 100,
    cursor: input.cursor,
  });

  // Transform to summary format
  const workflows: WorkflowSummary[] = response.data.map((wf: N8NWorkflow) => ({
    id: wf.id,
    name: wf.name,
    active: wf.active,
    tags: wf.tags || [],
    nodes_count: wf.nodes.length,
    created_at: wf.createdAt,
    updated_at: wf.updatedAt,
  }));

  // Parse current offset from cursor (if exists)
  const currentOffset = input.cursor
    ? parseInt(Buffer.from(input.cursor, 'base64').toString('utf-8').split(':')[1] || '0', 10)
    : 0;

  // Create transparent cursor
  const cursor: TransparentCursor = {
    token: response.nextCursor || null,
    position: currentOffset + workflows.length,
    has_more: !!response.nextCursor,
    page_size: input.limit || 100,
  };

  // Execution metadata
  const meta = createMetadataFromStart(startTime, '1.2.0');

  return {
    workflows,
    cursor,
    meta,
  };
}
