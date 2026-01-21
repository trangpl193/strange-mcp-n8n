import { McpError, McpErrorCode, errorContext } from '@strange/mcp-core';
import type {
  N8NWorkflow,
  N8NNode,
  N8NExecution,
  N8NExecutionWithData,
  N8NListResponse,
  N8NErrorResponse,
} from '../types.js';

/**
 * N8N-specific recovery hints for AI agents
 */
const N8N_RECOVERY_HINTS = {
  // Workflow errors
  WORKFLOW_NOT_FOUND: 'Verify workflow ID exists in N8N instance',
  WORKFLOW_VALIDATION: 'Check workflow schema - ensure all nodes have valid types and required parameters',
  WORKFLOW_DUPLICATE: 'Use a different workflow name or update existing workflow',

  // Execution errors
  EXECUTION_NOT_FOUND: 'Verify execution ID - it may have been deleted or never existed',
  EXECUTION_STILL_RUNNING: 'Wait for execution to complete before accessing full data',

  // Credential errors
  CREDENTIAL_NOT_FOUND: 'Verify credential ID or name exists in N8N',
  CREDENTIAL_INVALID: 'Check credential configuration and test connection',

  // Authentication errors
  INVALID_API_KEY: 'Verify N8N API key is correct and has not expired',
  INSUFFICIENT_PERMISSIONS: 'Check N8N user permissions for this operation',

  // Network errors
  NETWORK_ERROR: 'Check N8N instance is running and accessible',
  TIMEOUT: 'N8N instance may be slow - consider increasing timeout or checking instance health',

  // Generic
  UNKNOWN: 'Check N8N instance logs for detailed error information',
} as const;

/**
 * Map N8N HTTP status + error code to recovery hint
 */
function getN8NRecoveryHint(statusCode: number, n8nCode?: number | string, path?: string): string {
  // 401 Unauthorized
  if (statusCode === 401) {
    return N8N_RECOVERY_HINTS.INVALID_API_KEY;
  }

  // 403 Forbidden
  if (statusCode === 403) {
    return N8N_RECOVERY_HINTS.INSUFFICIENT_PERMISSIONS;
  }

  // 404 Not Found
  if (statusCode === 404) {
    if (path?.includes('/workflow')) return N8N_RECOVERY_HINTS.WORKFLOW_NOT_FOUND;
    if (path?.includes('/execution')) return N8N_RECOVERY_HINTS.EXECUTION_NOT_FOUND;
    if (path?.includes('/credential')) return N8N_RECOVERY_HINTS.CREDENTIAL_NOT_FOUND;
  }

  // 400 Bad Request - check N8N error code
  if (statusCode === 400) {
    const codeStr = String(n8nCode || '');
    if (codeStr.includes('VALIDATION') || codeStr.includes('validation')) {
      return N8N_RECOVERY_HINTS.WORKFLOW_VALIDATION;
    }
    if (codeStr.includes('DUPLICATE') || codeStr.includes('duplicate')) {
      return N8N_RECOVERY_HINTS.WORKFLOW_DUPLICATE;
    }
  }

  // 409 Conflict
  if (statusCode === 409) {
    return N8N_RECOVERY_HINTS.EXECUTION_STILL_RUNNING;
  }

  return N8N_RECOVERY_HINTS.UNKNOWN;
}

export interface N8NClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

/**
 * HTTP client for N8N API
 */
export class N8NClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: N8NClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  /**
   * Make HTTP request to N8N API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          code: response.status,
          message: response.statusText,
        })) as N8NErrorResponse;

        throw new McpError(
          McpErrorCode.TOOL_EXECUTION_FAILED,
          `N8N API error: ${errorData.message}`,
          {
            details: {
              context: errorContext()
                .location('N8NClient.request')
                .operation(`${method} ${path}`)
                .hint(getN8NRecoveryHint(response.status, errorData.code, path))
                .data('statusCode', response.status)
                .data('n8nCode', errorData.code)
                .data('path', path)
                .build()
            }
          }
        );
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof McpError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new McpError(
            McpErrorCode.TIMEOUT,
            `Request to N8N API timed out after ${this.timeout}ms`,
            {
              details: {
                context: errorContext()
                  .location('N8NClient.request')
                  .operation(`${method} ${path}`)
                  .hint(N8N_RECOVERY_HINTS.TIMEOUT)
                  .data('timeout_ms', this.timeout)
                  .data('path', path)
                  .build()
              }
            }
          );
        }

        throw new McpError(
          McpErrorCode.CONNECTION_FAILED,
          `Network error: ${error.message}`,
          {
            details: {
              context: errorContext()
                .location('N8NClient.request')
                .operation(`${method} ${path}`)
                .hint(N8N_RECOVERY_HINTS.NETWORK_ERROR)
                .data('path', path)
                .data('originalError', error.message)
                .build()
            }
          }
        );
      }

      throw new McpError(
        McpErrorCode.INTERNAL_ERROR,
        'Unknown error occurred',
        {
          details: {
            context: errorContext()
              .location('N8NClient.request')
              .operation(`${method} ${path}`)
              .hint(N8N_RECOVERY_HINTS.UNKNOWN)
              .data('path', path)
              .build()
          }
        }
      );
    }
  }

  /**
   * List workflows
   */
  async listWorkflows(params?: {
    active?: boolean;
    tags?: string;
    name?: string;
    limit?: number;
    cursor?: string;
  }): Promise<N8NListResponse<N8NWorkflow>> {
    const queryParams: Record<string, string> = {};

    if (params?.active !== undefined) {
      queryParams.active = params.active.toString();
    }
    if (params?.tags) {
      queryParams.tags = params.tags;
    }
    if (params?.name) {
      queryParams.name = params.name;
    }
    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }

    return this.request<N8NListResponse<N8NWorkflow>>(
      'GET',
      '/api/v1/workflows',
      undefined,
      queryParams
    );
  }

  /**
   * Get single workflow
   */
  async getWorkflow(workflowId: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>(
      'GET',
      `/api/v1/workflows/${workflowId}`
    );
  }

  /**
   * Create workflow
   */
  async createWorkflow(workflow: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>(
      'POST',
      '/api/v1/workflows',
      workflow
    );
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    workflowId: string,
    workflow: Partial<N8NWorkflow>
  ): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>(
      'PUT',
      `/api/v1/workflows/${workflowId}`,
      workflow
    );
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/api/v1/workflows/${workflowId}`
    );
  }

  /**
   * Activate workflow
   * N8N API treats 'active' as read-only on PUT, so activation requires separate endpoint
   */
  async activateWorkflow(workflowId: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>(
      'POST',
      `/api/v1/workflows/${workflowId}/activate`
    );
  }

  /**
   * Deactivate workflow
   */
  async deactivateWorkflow(workflowId: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>(
      'POST',
      `/api/v1/workflows/${workflowId}/deactivate`
    );
  }

  /**
   * List executions
   */
  async listExecutions(params?: {
    workflowId?: string;
    status?: 'success' | 'error' | 'running' | 'waiting';
    limit?: number;
    cursor?: string;
  }): Promise<N8NListResponse<N8NExecution>> {
    const queryParams: Record<string, string> = {};

    if (params?.workflowId) {
      queryParams.workflowId = params.workflowId;
    }
    if (params?.status) {
      queryParams.status = params.status;
    }
    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }
    if (params?.cursor) {
      queryParams.cursor = params.cursor;
    }

    return this.request<N8NListResponse<N8NExecution>>(
      'GET',
      '/api/v1/executions',
      undefined,
      queryParams
    );
  }

  /**
   * Get execution with data
   */
  async getExecution(
    executionId: string,
    includeData: 'none' | 'result' | 'all' = 'all'
  ): Promise<N8NExecutionWithData> {
    // N8N API expects boolean for includeData
    const includeDataBool = includeData !== 'none' ? 'true' : 'false';
    return this.request<N8NExecutionWithData>(
      'GET',
      `/api/v1/executions/${executionId}`,
      undefined,
      { includeData: includeDataBool }
    );
  }

  // ========================================
  // Node-level operations (abstraction layer)
  // ========================================

  /**
   * Find a node by name or ID within a workflow
   * @param workflow - The workflow to search in
   * @param identifier - Node name or ID
   * @returns The node and its index, or null if not found
   */
  findNodeByIdentifier(
    workflow: N8NWorkflow,
    identifier: string
  ): { node: N8NNode; index: number } | null {
    const index = workflow.nodes.findIndex(
      (n) => n.id === identifier || n.name === identifier
    );
    if (index === -1) return null;
    return { node: workflow.nodes[index], index };
  }

  /**
   * Get a single node from a workflow
   * Encapsulates: fetch workflow -> find node -> return node only
   */
  async getNode(
    workflowId: string,
    nodeIdentifier: string
  ): Promise<{ node: N8NNode; workflow: N8NWorkflow }> {
    const workflow = await this.getWorkflow(workflowId);
    const result = this.findNodeByIdentifier(workflow, nodeIdentifier);

    if (!result) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        `Node "${nodeIdentifier}" not found in workflow "${workflow.name}"`,
        {
          details: {
            context: errorContext()
              .location('N8NClient.getNode')
              .operation(`find node ${nodeIdentifier}`)
              .hint(`Available nodes: ${workflow.nodes.map(n => n.name).join(', ')}`)
              .data('workflowId', workflowId)
              .data('nodeIdentifier', nodeIdentifier)
              .build()
          }
        }
      );
    }

    return { node: result.node, workflow };
  }

  /**
   * Update a single node in a workflow
   * Encapsulates: fetch workflow -> modify node -> PUT full workflow
   * @returns Updated node and workflow metadata
   */
  async updateNode(
    workflowId: string,
    nodeIdentifier: string,
    updates: {
      name?: string;
      parameters?: Record<string, any>;
      position?: [number, number];
      disabled?: boolean;
    }
  ): Promise<{ node: N8NNode; workflow: N8NWorkflow; updatedFields: string[] }> {
    // 1. Fetch current workflow
    const workflow = await this.getWorkflow(workflowId);

    // 2. Find the node
    const result = this.findNodeByIdentifier(workflow, nodeIdentifier);
    if (!result) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        `Node "${nodeIdentifier}" not found in workflow "${workflow.name}"`,
        {
          details: {
            context: errorContext()
              .location('N8NClient.updateNode')
              .operation(`find node ${nodeIdentifier}`)
              .hint(`Available nodes: ${workflow.nodes.map(n => n.name).join(', ')}`)
              .data('workflowId', workflowId)
              .data('nodeIdentifier', nodeIdentifier)
              .build()
          }
        }
      );
    }

    // 3. Track updated fields
    const updatedFields: string[] = [];
    const originalNodeName = result.node.name;

    // 4. Apply updates
    if (updates.name !== undefined && updates.name !== result.node.name) {
      // If renaming, also update connections
      const oldName = result.node.name;
      result.node.name = updates.name;
      updatedFields.push('name');

      // Update connections that reference this node
      this.updateConnectionsForRenamedNode(workflow, oldName, updates.name);
    }

    if (updates.parameters !== undefined) {
      // Merge parameters (allow partial update)
      result.node.parameters = {
        ...result.node.parameters,
        ...updates.parameters,
      };
      updatedFields.push('parameters');
    }

    if (updates.position !== undefined) {
      result.node.position = updates.position;
      updatedFields.push('position');
    }

    if (updates.disabled !== undefined) {
      (result.node as any).disabled = updates.disabled;
      updatedFields.push('disabled');
    }

    // 5. Update workflow in place
    workflow.nodes[result.index] = result.node;

    // 6. PUT the full workflow
    // Note: N8N API treats 'active' as read-only on PUT, so we omit it
    const updatedWorkflow = await this.updateWorkflow(workflowId, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
    });

    // 7. Find the updated node in response
    const updatedNode = this.findNodeByIdentifier(
      updatedWorkflow,
      updates.name || originalNodeName
    );

    return {
      node: updatedNode?.node || result.node,
      workflow: updatedWorkflow,
      updatedFields,
    };
  }

  /**
   * Update connections when a node is renamed
   */
  private updateConnectionsForRenamedNode(
    workflow: N8NWorkflow,
    oldName: string,
    newName: string
  ): void {
    // Update source node name in connections
    if (workflow.connections[oldName]) {
      workflow.connections[newName] = workflow.connections[oldName];
      delete workflow.connections[oldName];
    }

    // Update target node references
    for (const sourceNode of Object.keys(workflow.connections)) {
      const conn = workflow.connections[sourceNode];
      if (conn.main) {
        for (const outputArr of conn.main) {
          if (outputArr) {
            for (const target of outputArr) {
              if (target.node === oldName) {
                target.node = newName;
              }
            }
          }
        }
      }
    }
  }

}
