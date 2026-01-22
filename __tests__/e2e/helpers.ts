/**
 * E2E Test Helpers
 *
 * Utilities for E2E testing including config loading and client setup.
 */

import { N8NClient } from '../../src/services/n8n-client.js';

export interface E2EConfig {
  n8n: {
    url: string;
    apiKey: string;
    timeout: number;
  };
}

/**
 * Load E2E configuration from environment variables
 */
export function getE2EConfig(): E2EConfig {
  const url = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!url || !apiKey) {
    throw new Error('N8N_URL and N8N_API_KEY environment variables are required for E2E tests');
  }

  return {
    n8n: {
      url,
      apiKey,
      timeout: parseInt(process.env.N8N_TIMEOUT || '30000', 10),
    },
  };
}

/**
 * Create N8N client for E2E tests
 */
export function createE2EClient(): N8NClient {
  const config = getE2EConfig();
  return new N8NClient({
    baseUrl: config.n8n.url,
    apiKey: config.n8n.apiKey,
    timeout: config.n8n.timeout,
  });
}

/**
 * Check if E2E tests should run
 */
export const RUN_E2E = process.env.N8N_URL !== undefined && process.env.N8N_API_KEY !== undefined;

/**
 * Skip test if E2E is not enabled
 */
export function skipIfNoE2E() {
  if (!RUN_E2E) {
    return describe.skip;
  }
  return describe;
}
