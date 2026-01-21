/**
 * Configuration for N8N MCP Server
 */
export interface N8NConfig {
  n8nUrl: string;
  apiKey: string;
  timeout?: number;
}

/**
 * Session store configuration
 */
export interface SessionStoreConfig {
  type: 'memory' | 'redis';
  redisUrl?: string;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): N8NConfig {
  const n8nUrl = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!n8nUrl) {
    throw new Error('N8N_URL environment variable is required');
  }

  if (!apiKey) {
    throw new Error('N8N_API_KEY environment variable is required');
  }

  return {
    n8nUrl,
    apiKey,
    timeout: parseInt(process.env.N8N_TIMEOUT || '30000', 10),
  };
}

/**
 * Load session store configuration
 */
export function loadSessionStoreConfig(): SessionStoreConfig {
  const redisUrl = process.env.REDIS_URL;

  // Use Redis if REDIS_URL is set, otherwise fallback to memory
  if (redisUrl) {
    return {
      type: 'redis',
      redisUrl,
    };
  }

  return { type: 'memory' };
}
