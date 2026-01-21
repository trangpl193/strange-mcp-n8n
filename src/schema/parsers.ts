/**
 * Input Parsing Utilities
 *
 * Automatically parses tool input from API-specific format
 * back to canonical format using stored flattening hints.
 */

import { parseToolInput } from './index.js';

/**
 * Parse workflow_create input
 */
export function parseWorkflowCreateInput(args: Record<string, unknown>): {
  name: string;
  steps: unknown[];
  active?: boolean;
  tags?: string[];
  credentials?: Record<string, string>;
} {
  const parsed = parseToolInput('workflow_create', args);

  return {
    name: parsed.name as string,
    steps: parsed.steps as unknown[],
    active: parsed.active as boolean | undefined,
    tags: parsed.tags as string[] | undefined,
    credentials: parsed.credentials as Record<string, string> | undefined,
  };
}

/**
 * Parse workflow_update input
 */
export function parseWorkflowUpdateInput(args: Record<string, unknown>): {
  workflowId: string;
  name?: string;
  steps?: unknown[];
  nodes?: unknown[];
  connections?: unknown;
  credentials?: Record<string, string>;
  active?: boolean;
  rename?: string;
  addTags?: string[];
  removeTags?: string[];
} {
  const parsed = parseToolInput('workflow_update', args);

  return {
    workflowId: parsed.workflowId as string,
    name: parsed.name as string | undefined,
    steps: parsed.steps as unknown[] | undefined,
    nodes: parsed.nodes as unknown[] | undefined,
    connections: parsed.connections as unknown,
    credentials: parsed.credentials as Record<string, string> | undefined,
    active: parsed.active as boolean | undefined,
    rename: parsed.rename as string | undefined,
    addTags: parsed.addTags as string[] | undefined,
    removeTags: parsed.removeTags as string[] | undefined,
  };
}

/**
 * Parse node_update input
 */
export function parseNodeUpdateInput(args: Record<string, unknown>): {
  workflowId: string;
  nodeIdentifier: string;
  name?: string;
  parameters?: Record<string, unknown>;
  position?: [number, number];
  disabled?: boolean;
} {
  const parsed = parseToolInput('node_update', args);

  return {
    workflowId: parsed.workflowId as string,
    nodeIdentifier: parsed.nodeIdentifier as string,
    name: parsed.name as string | undefined,
    parameters: parsed.parameters as Record<string, unknown> | undefined,
    position: parsed.position as [number, number] | undefined,
    disabled: parsed.disabled as boolean | undefined,
  };
}

/**
 * Parse builder_start input
 */
export function parseBuilderStartInput(args: Record<string, unknown>): {
  name: string;
  description?: string;
  credentials?: Record<string, string>;
} {
  const parsed = parseToolInput('builder_start', args);

  return {
    name: parsed.name as string,
    description: parsed.description as string | undefined,
    credentials: parsed.credentials as Record<string, string> | undefined,
  };
}

/**
 * Parse builder_add_node input
 */
export function parseBuilderAddNodeInput(args: Record<string, unknown>): {
  sessionId: string;
  node: {
    type: string;
    name?: string;
    action?: string;
    config?: Record<string, unknown>;
    credential?: string;
    position?: [number, number];
  };
} {
  const parsed = parseToolInput('builder_add_node', args);

  return {
    sessionId: parsed.sessionId as string,
    node: parsed.node as {
      type: string;
      name?: string;
      action?: string;
      config?: Record<string, unknown>;
      credential?: string;
      position?: [number, number];
    },
  };
}

/**
 * Generic parser for simple tools that don't need transformation
 */
export function parseSimpleInput<T>(toolName: string, args: Record<string, unknown>): T {
  return parseToolInput(toolName, args) as T;
}
