/**
 * Builder Session Types and Interfaces
 *
 * Phase 2A: Stateful Workflow Builder
 * Storage: In-Memory with TTL
 */

import type { SimplifiedStep } from '../schemas/simplified-workflow.js';
import type { N8NNode, N8NConnections } from '../types.js';

// ============================================
// Session Types
// ============================================

export interface BuilderSession {
  session_id: string;
  name: string;
  status: 'active' | 'expired' | 'committed';
  created_at: string;
  updated_at: string;
  expires_at: string;

  // Draft workflow data
  workflow_draft: WorkflowDraft;

  // Operation history for debugging
  operations_log: OperationLogEntry[];

  // Credential mapping
  credentials: Map<string, string>;
}

export interface WorkflowDraft {
  name: string;
  description?: string;
  nodes: DraftNode[];
  connections: DraftConnection[];
  settings: Record<string, unknown>;
}

export interface DraftNode {
  id: string;
  name: string;
  type: string;           // Simplified type (e.g., "postgres", "webhook")
  n8n_type?: string;      // Full N8N type (e.g., "n8n-nodes-base.postgres")
  parameters: Record<string, unknown>;
  position: [number, number];
  credential?: string;
}

export interface DraftConnection {
  from_node: string;      // Node name or ID
  to_node: string;        // Node name or ID
  from_output: number;    // Output index (default 0)
  to_input: number;       // Input index (default 0)
}

export interface OperationLogEntry {
  operation: string;
  timestamp: string;
  details: Record<string, unknown>;
}

// ============================================
// Tool Input/Output Types
// ============================================

// builder_start
export interface BuilderStartInput {
  name: string;
  description?: string;
  credentials?: Record<string, string>;
}

export interface BuilderStartOutput {
  session_id: string;
  name: string;
  expires_at: string;
  ttl_seconds: number;
  message: string;
}

// builder_add_node
export interface BuilderAddNodeInput {
  session_id: string;
  node: {
    type: string;
    name?: string;
    action?: string;
    config?: Record<string, unknown>;
    credential?: string;
    position?: [number, number];
  };
}

export interface BuilderAddNodeOutput {
  success: boolean;
  node_id: string;
  node_name: string;
  nodes_count: number;
  hint: string;
}

// builder_connect
export interface BuilderConnectInput {
  session_id: string;
  from_node: string;
  to_node: string;
  from_output?: number;
  to_input?: number;
}

export interface BuilderConnectOutput {
  success: boolean;
  connection: {
    from: string;
    to: string;
  };
  connections_count: number;
}

// builder_commit
export interface BuilderCommitInput {
  session_id: string;
  activate?: boolean;
}

export interface BuilderCommitOutput {
  success: boolean;
  workflow: {
    id: string;
    name: string;
    active: boolean;
    nodes_count: number;
    url?: string;
  };
  session_closed: boolean;
}

// builder_discard
export interface BuilderDiscardInput {
  session_id: string;
}

export interface BuilderDiscardOutput {
  success: boolean;
  message: string;
}

// builder_list (Discovery)
export interface BuilderListInput {
  include_expired?: boolean;
}

export interface BuilderListOutput {
  drafts: DraftSummary[];
  total: number;
}

export interface DraftSummary {
  session_id: string;
  name: string;
  status: 'active' | 'expired';
  nodes_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  last_operation: string;
  preview: {
    trigger_type: string | null;
    node_types: string[];
  };
}

// ============================================
// Session Store Interface
// ============================================

export interface SessionStore {
  create(session: BuilderSession): Promise<void>;
  get(sessionId: string): Promise<BuilderSession | null>;
  update(session: BuilderSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(includeExpired?: boolean): Promise<BuilderSession[]>;
  cleanup(): Promise<number>;
}

// ============================================
// Constants
// ============================================

export const BUILDER_CONSTANTS = {
  SESSION_TTL_MS: 30 * 60 * 1000,        // 30 minutes
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,    // 5 minutes
  EXPIRED_ARCHIVE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_NODE_SPACING: 180,
  DEFAULT_START_POSITION: [100, 200] as [number, number],
};
