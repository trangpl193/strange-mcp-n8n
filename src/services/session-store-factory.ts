/**
 * Unified Session Store Factory
 *
 * Automatically selects Redis or In-Memory based on configuration.
 * - Redis: Production (REDIS_URL set)
 * - Memory: Development/Testing (no REDIS_URL)
 */

import type { SessionStore, DraftSummary, BuilderSession } from './builder-types.js';
import { loadSessionStoreConfig } from '../config.js';
import { InMemorySessionStore, getSessionStore as getMemoryStore } from './builder-session-store.js';
import { RedisSessionStore, getRedisSessionStore } from './redis-session-store.js';

/**
 * Extended SessionStore interface with additional methods
 */
export interface ExtendedSessionStore extends SessionStore {
  generateSessionId(): string;
  resume(sessionId: string): Promise<BuilderSession | null>;
  getSummaries(includeExpired?: boolean): Promise<DraftSummary[]>;
  getStats(): { active: number; expired: number } | Promise<{ active: number; expired: number }>;
}

// Singleton instance
let storeInstance: ExtendedSessionStore | null = null;
let storeType: 'memory' | 'redis' | null = null;

/**
 * Initialize and get the session store
 *
 * First call determines the store type based on config.
 * Subsequent calls return the same instance.
 */
export async function initSessionStore(): Promise<ExtendedSessionStore> {
  if (storeInstance) {
    return storeInstance;
  }

  const config = loadSessionStoreConfig();
  storeType = config.type;

  if (config.type === 'redis' && config.redisUrl) {
    console.log('📦 Session store: Redis');
    const redisStore = getRedisSessionStore(config.redisUrl);
    await redisStore.connect();
    storeInstance = redisStore;
  } else {
    console.log('📦 Session store: In-Memory');
    storeInstance = getMemoryStore();
  }

  return storeInstance;
}

/**
 * Get the current session store (must call initSessionStore first)
 */
export function getUnifiedSessionStore(): ExtendedSessionStore {
  if (!storeInstance) {
    // Fallback to memory for sync access (e.g., during startup)
    console.warn('⚠️ Session store not initialized, using in-memory fallback');
    storeInstance = getMemoryStore();
    storeType = 'memory';
  }
  return storeInstance;
}

/**
 * Get the current store type
 */
export function getSessionStoreType(): 'memory' | 'redis' | null {
  return storeType;
}

/**
 * Reset the session store (for testing)
 */
export async function resetUnifiedSessionStore(): Promise<void> {
  if (storeInstance) {
    if (storeType === 'redis' && storeInstance instanceof RedisSessionStore) {
      await storeInstance.disconnect();
    } else if (storeInstance instanceof InMemorySessionStore) {
      storeInstance.stopCleanup();
    }
  }
  storeInstance = null;
  storeType = null;
}
