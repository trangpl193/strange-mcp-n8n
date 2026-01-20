import { McpError, ErrorContext } from '@strange/mcp-core';
import type {
  N8NWorkflow,
  N8NExecution,
  N8NExecutionWithData,
  N8NCredential,
  N8NListResponse,
  N8NErrorResponse,
} from '../types.js';

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
        const errorData: N8NErrorResponse = await response.json().catch(() => ({
          code: response.status,
          message: response.statusText,
        }));

        throw new McpError(
          ErrorContext.EXTERNAL_API,
          `N8N API error: ${errorData.message}`,
          {
            statusCode: response.status,
            n8nCode: errorData.code,
            hint: errorData.hint,
            path,
          }
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof McpError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new McpError(
            ErrorContext.TIMEOUT,
            `Request to N8N API timed out after ${this.timeout}ms`,
            { path }
          );
        }

        throw new McpError(
          ErrorContext.NETWORK,
          `Network error: ${error.message}`,
          { path, originalError: error.message }
        );
      }

      throw new McpError(
        ErrorContext.UNKNOWN,
        'Unknown error occurred',
        { path }
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
    return this.request<N8NExecutionWithData>(
      'GET',
      `/api/v1/executions/${executionId}`,
      undefined,
      { includeData }
    );
  }

  /**
   * List credentials
   */
  async listCredentials(params?: {
    type?: string;
  }): Promise<N8NCredential[]> {
    const queryParams: Record<string, string> = {};

    if (params?.type) {
      queryParams.type = params.type;
    }

    // N8N credentials endpoint returns array directly, not wrapped
    return this.request<N8NCredential[]>(
      'GET',
      '/api/v1/credentials',
      undefined,
      queryParams
    );
  }
}
