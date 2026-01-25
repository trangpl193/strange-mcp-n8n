import { ExecutionMetadata, createMetadataFromStart, createCursor, createInitialCursor, TransparentCursor } from '@strange/mcp-core';
import { N8NClient } from '../services/index.js';
import type { N8NWorkflow } from '../types.js';

export type WorkflowListMode = 'minimal' | 'summary' | 'detailed';

export interface WorkflowListInput {
  active?: boolean;
  tags?: string;
  name?: string;
  limit?: number;
  cursor?: string;
  mode?: WorkflowListMode;  // Progressive loading: minimal | summary (default) | detailed
}

export interface WorkflowMinimal {
  id: string;
  name: string;
  active: boolean;
}

export interface WorkflowSummary extends WorkflowMinimal {
  tags: string[];
  nodes_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDetailed extends WorkflowSummary {
  node_types: string[];      // Unique node types in workflow
  connections_count: number;  // Total connection count
  has_trigger: boolean;       // Whether workflow has a trigger node
}

export interface WorkflowListOutput {
  workflows: WorkflowMinimal[] | WorkflowSummary[] | WorkflowDetailed[];
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

  // Determine mode (default: summary for backward compatibility)
  const mode = input.mode || 'summary';

  // Transform based on mode
  const workflows: WorkflowMinimal[] | WorkflowSummary[] | WorkflowDetailed[] = response.data.map((wf: N8NWorkflow) => {
    // Tier 1: Minimal (id, name, active only)
    if (mode === 'minimal') {
      return {
        id: wf.id,
        name: wf.name,
        active: wf.active,
      } as WorkflowMinimal;
    }

    // Tier 2: Summary (default - backward compatible)
    if (mode === 'summary') {
      return {
        id: wf.id,
        name: wf.name,
        active: wf.active,
        tags: wf.tags || [],
        nodes_count: wf.nodes.length,
        created_at: wf.createdAt,
        updated_at: wf.updatedAt,
      } as WorkflowSummary;
    }

    // Tier 3: Detailed (includes node types, connections, trigger status)
    const nodeTypes = [...new Set(wf.nodes.map(n => n.type))];
    const hasTrigger = wf.nodes.some(n =>
      n.type.includes('trigger') ||
      n.type.includes('webhook') ||
      n.type.endsWith('.manualTrigger')
    );

    return {
      id: wf.id,
      name: wf.name,
      active: wf.active,
      tags: wf.tags || [],
      nodes_count: wf.nodes.length,
      created_at: wf.createdAt,
      updated_at: wf.updatedAt,
      node_types: nodeTypes,
      connections_count: wf.connections?.length || 0,
      has_trigger: hasTrigger,
    } as WorkflowDetailed;
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
    cursor,
    meta,
  };
}
