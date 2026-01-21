/**
 * Redis Session Store for Builder Pattern
 *
 * Phase 2B: Production-ready session persistence
 * - Sessions survive container restarts
 * - TTL handled by Redis EXPIRE
 * - Expired archive for session recovery
 */

import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import type {
  BuilderSession,
  SessionStore,
  DraftSummary,
} from './builder-types.js';
import { BUILDER_CONSTANTS } from './builder-types.js';

// Redis key prefixes
const KEYS = {
  SESSION: 'mcp:n8n:builder:session:',
  EXPIRED: 'mcp:n8n:builder:expired:',
  INDEX: 'mcp:n8n:builder:sessions',
  EXPIRED_INDEX: 'mcp:n8n:builder:expired_sessions',
};

/**
 * Redis Session Store
 *
 * Features:
 * - TTL-based expiration via Redis EXPIRE
 * - Expired session archiving for recovery
 * - Atomic operations with Redis transactions
 */
export class RedisSessionStore implements SessionStore {
  private redis: Redis;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('🔴 Redis session store connected');
    });

    this.startCleanupInterval();
  }

  /**
   * Connect to Redis (call before using)
   */
  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return `builder-${randomUUID().slice(0, 8)}`;
  }

  /**
   * Create a new session
   */
  async create(session: BuilderSession): Promise<void> {
    const key = KEYS.SESSION + session.session_id;
    const ttlSeconds = Math.floor(BUILDER_CONSTANTS.SESSION_TTL_MS / 1000);

    // Serialize session (convert Map to object)
    const serialized = this.serializeSession(session);

    await this.redis
      .multi()
      .set(key, JSON.stringify(serialized))
      .expire(key, ttlSeconds)
      .sadd(KEYS.INDEX, session.session_id)
      .exec();
  }

  /**
   * Get a session by ID (checks both active and expired)
   */
  async get(sessionId: string): Promise<BuilderSession | null> {
    // Check active sessions first
    const activeKey = KEYS.SESSION + sessionId;
    const activeData = await this.redis.get(activeKey);

    if (activeData) {
      const session = this.deserializeSession(JSON.parse(activeData));

      // Check if expired (TTL might have passed)
      const ttl = await this.redis.ttl(activeKey);
      if (ttl <= 0) {
        await this.archiveSession(sessionId);
        return this.getFromArchive(sessionId);
      }

      return session;
    }

    // Check expired archive
    return this.getFromArchive(sessionId);
  }

  /**
   * Update an existing session
   */
  async update(session: BuilderSession): Promise<void> {
    const key = KEYS.SESSION + session.session_id;
    const ttlSeconds = Math.floor(BUILDER_CONSTANTS.SESSION_TTL_MS / 1000);

    session.updated_at = new Date().toISOString();
    session.expires_at = new Date(
      Date.now() + BUILDER_CONSTANTS.SESSION_TTL_MS
    ).toISOString();

    const serialized = this.serializeSession(session);

    await this.redis
      .multi()
      .set(key, JSON.stringify(serialized))
      .expire(key, ttlSeconds)
      .exec();
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    await this.redis
      .multi()
      .del(KEYS.SESSION + sessionId)
      .del(KEYS.EXPIRED + sessionId)
      .srem(KEYS.INDEX, sessionId)
      .srem(KEYS.EXPIRED_INDEX, sessionId)
      .exec();
  }

  /**
   * List all sessions (optionally including expired)
   */
  async list(includeExpired: boolean = false): Promise<BuilderSession[]> {
    const result: BuilderSession[] = [];

    // Get active session IDs
    const activeIds = await this.redis.smembers(KEYS.INDEX);

    for (const id of activeIds) {
      const session = await this.get(id);
      if (session) {
        result.push(session);
      }
    }

    // Get expired sessions if requested
    if (includeExpired) {
      const expiredIds = await this.redis.smembers(KEYS.EXPIRED_INDEX);
      for (const id of expiredIds) {
        const session = await this.getFromArchive(id);
        if (session) {
          result.push(session);
        }
      }
    }

    // Sort by updated_at (most recent first)
    result.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return result;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    // Check active sessions for expired ones
    const activeIds = await this.redis.smembers(KEYS.INDEX);

    for (const id of activeIds) {
      const key = KEYS.SESSION + id;
      const ttl = await this.redis.ttl(key);

      if (ttl <= 0) {
        await this.archiveSession(id);
        cleaned++;
      }
    }

    // Clean old archived sessions
    const archiveExpiryMs = BUILDER_CONSTANTS.EXPIRED_ARCHIVE_TTL_MS;
    const expiredIds = await this.redis.smembers(KEYS.EXPIRED_INDEX);

    for (const id of expiredIds) {
      const session = await this.getFromArchive(id);
      if (session) {
        const age = Date.now() - new Date(session.updated_at).getTime();
        if (age > archiveExpiryMs) {
          await this.redis
            .multi()
            .del(KEYS.EXPIRED + id)
            .srem(KEYS.EXPIRED_INDEX, id)
            .exec();
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Resume an expired session (recreate with new ID)
   */
  async resume(sessionId: string): Promise<BuilderSession | null> {
    // Check active first
    const active = await this.get(sessionId);
    if (active && active.status !== 'expired') {
      // Still active, just extend TTL
      await this.update(active);
      return active;
    }

    // Check expired archive
    const expired = await this.getFromArchive(sessionId);
    if (!expired) {
      return null;
    }

    // Create new session from expired data
    const newSession: BuilderSession = {
      ...expired,
      session_id: this.generateSessionId(),
      status: 'active',
      updated_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + BUILDER_CONSTANTS.SESSION_TTL_MS
      ).toISOString(),
      operations_log: [
        ...expired.operations_log,
        {
          operation: 'resumed',
          timestamp: new Date().toISOString(),
          details: { previous_session_id: sessionId },
        },
      ],
    };

    // Save new session
    await this.create(newSession);

    // Remove from archive
    await this.redis
      .multi()
      .del(KEYS.EXPIRED + sessionId)
      .srem(KEYS.EXPIRED_INDEX, sessionId)
      .exec();

    return newSession;
  }

  /**
   * Get session status summary for listing
   */
  async getSummaries(includeExpired: boolean = false): Promise<DraftSummary[]> {
    const sessions = await this.list(includeExpired);

    return sessions.map((session) => {
      const lastOp = session.operations_log[session.operations_log.length - 1];
      const triggerNode = session.workflow_draft.nodes.find(
        (n) => n.type === 'webhook' || n.type === 'schedule' || n.type === 'manual'
      );

      return {
        session_id: session.session_id,
        name: session.name,
        status: session.status === 'committed' ? 'active' : session.status,
        nodes_count: session.workflow_draft.nodes.length,
        created_at: session.created_at,
        updated_at: session.updated_at,
        expires_at: session.expires_at,
        last_operation: lastOp ? `${lastOp.operation}` : 'created',
        preview: {
          trigger_type: triggerNode?.type || null,
          node_types: session.workflow_draft.nodes.map((n) => n.type),
        },
      };
    });
  }

  /**
   * Get stats (for debugging)
   */
  async getStats(): Promise<{ active: number; expired: number }> {
    const [active, expired] = await Promise.all([
      this.redis.scard(KEYS.INDEX),
      this.redis.scard(KEYS.EXPIRED_INDEX),
    ]);

    return { active, expired };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    this.stopCleanup();
    await this.redis.quit();
  }

  // ============================================
  // Private Methods
  // ============================================

  private async getFromArchive(sessionId: string): Promise<BuilderSession | null> {
    const key = KEYS.EXPIRED + sessionId;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return this.deserializeSession(JSON.parse(data));
  }

  private async archiveSession(sessionId: string): Promise<void> {
    const activeKey = KEYS.SESSION + sessionId;
    const data = await this.redis.get(activeKey);

    if (data) {
      const session = this.deserializeSession(JSON.parse(data));
      session.status = 'expired';

      const expiredKey = KEYS.EXPIRED + sessionId;
      const archiveTtl = Math.floor(
        BUILDER_CONSTANTS.EXPIRED_ARCHIVE_TTL_MS / 1000
      );

      await this.redis
        .multi()
        .set(expiredKey, JSON.stringify(this.serializeSession(session)))
        .expire(expiredKey, archiveTtl)
        .sadd(KEYS.EXPIRED_INDEX, sessionId)
        .del(activeKey)
        .srem(KEYS.INDEX, sessionId)
        .exec();
    }
  }

  private serializeSession(
    session: BuilderSession
  ): Record<string, unknown> {
    return {
      ...session,
      credentials: Object.fromEntries(session.credentials),
    };
  }

  private deserializeSession(data: Record<string, unknown>): BuilderSession {
    return {
      ...data,
      credentials: new Map(
        Object.entries((data.credentials as Record<string, string>) || {})
      ),
    } as BuilderSession;
  }

  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.cleanup();
        if (cleaned > 0) {
          console.log(
            `🧹 Redis session cleanup: ${cleaned} sessions archived/removed`
          );
        }
      } catch (err) {
        console.error('Redis cleanup error:', err);
      }
    }, BUILDER_CONSTANTS.CLEANUP_INTERVAL_MS);

    this.cleanupTimer.unref();
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Singleton instance
let redisStoreInstance: RedisSessionStore | null = null;

export function getRedisSessionStore(
  redisUrl?: string
): RedisSessionStore {
  if (!redisStoreInstance) {
    redisStoreInstance = new RedisSessionStore(redisUrl);
  }
  return redisStoreInstance;
}

export function resetRedisSessionStore(): void {
  if (redisStoreInstance) {
    redisStoreInstance.disconnect().catch(console.error);
  }
  redisStoreInstance = null;
}
