/**
 * N8N API types
 */

export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8NNode[];
  connections: N8NConnections;
  settings?: N8NWorkflowSettings;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
  webhookId?: string;
}

export interface N8NConnections {
  [sourceNode: string]: {
    main?: Array<Array<{ node: string; type: string; index: number }>>;
  };
}

export interface N8NWorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
}

export interface N8NExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'internal' | 'retry';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  waitTill?: string;
  retryOf?: string;
  retrySuccessId?: string;
  status?: 'success' | 'error' | 'running' | 'waiting';
}

export interface N8NExecutionWithData extends N8NExecution {
  data: {
    resultData: {
      runData: Record<string, Array<{
        startTime: number;
        executionTime: number;
        source: any[];
        data: {
          main: Array<Array<{ json: any; binary?: any }>>;
        };
        error?: {
          message: string;
          stack?: string;
        };
      }>>;
    };
  };
}

export interface N8NCredential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8NListResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface N8NErrorResponse {
  code: number;
  message: string;
  hint?: string;
}
