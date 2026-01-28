/**
 * In-Memory Session Store for Builder Pattern
 *
 * Phase 2A: Simple Map-based storage with TTL
 * Phase 2B: Will be replaced with Redis
 */

import { randomUUID } from 'crypto';
import type {
  BuilderSession,
  SessionStore,
  WorkflowDraft,
  DraftSummary,
} from './builder-types.js';
import { BUILDER_CONSTANTS } from './builder-types.js';

/**
 * In-Memory Session Store
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup interval
 * - Expired session archiving (for recovery)
 */
export class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, BuilderSession> = new Map();
  private expiredArchive: Map<string, BuilderSession> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupInterval();
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
    this.sessions.set(session.session_id, session);
  }

  /**
   * Get a session by ID (checks both active and expired)
   */
  async get(sessionId: string): Promise<BuilderSession | null> {
    // Check active sessions first
    const active = this.sessions.get(sessionId);
    if (active) {
      // Check if expired
      if (new Date(active.expires_at) < new Date()) {
        await this.archiveSession(sessionId);
        return this.expiredArchive.get(sessionId) || null;
      }
      return active;
    }

    // Check expired archive
    return this.expiredArchive.get(sessionId) || null;
  }

  /**
   * Update an existing session
   */
  async update(session: BuilderSession): Promise<void> {
    session.updated_at = new Date().toISOString();
    // Extend expiration on update
    session.expires_at = new Date(
      Date.now() + BUILDER_CONSTANTS.SESSION_TTL_MS
    ).toISOString();

    this.sessions.set(session.session_id, session);
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.expiredArchive.delete(sessionId);
  }

  /**
   * List all sessions (optionally including expired)
   */
  async list(includeExpired: boolean = false): Promise<BuilderSession[]> {
    const result: BuilderSession[] = [];
    const now = new Date();

    // Active sessions
    for (const session of this.sessions.values()) {
      if (new Date(session.expires_at) < now) {
        // Mark as expired but still return
        session.status = 'expired';
      }
      result.push(session);
    }

    // Expired archive
    if (includeExpired) {
      for (const session of this.expiredArchive.values()) {
        result.push(session);
      }
    }

    // Sort by updated_at (most recent first)
    result.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return result;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    // Move expired sessions to archive
    for (const [id, session] of this.sessions) {
      if (new Date(session.expires_at) < now) {
        await this.archiveSession(id);
        cleaned++;
      }
    }

    // Clean old archived sessions
    const archiveExpiry = Date.now() - BUILDER_CONSTANTS.EXPIRED_ARCHIVE_TTL_MS;
    for (const [id, session] of this.expiredArchive) {
      if (new Date(session.updated_at).getTime() < archiveExpiry) {
        this.expiredArchive.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Resume an expired session (recreate with new ID)
   */
  async resume(sessionId: string): Promise<BuilderSession | null> {
    // Check active first
    const active = this.sessions.get(sessionId);
    if (active && new Date(active.expires_at) > new Date()) {
      // Still active, just extend TTL
      active.expires_at = new Date(
        Date.now() + BUILDER_CONSTANTS.SESSION_TTL_MS
      ).toISOString();
      active.updated_at = new Date().toISOString();
      return active;
    }

    // Check expired archive
    const expired = this.expiredArchive.get(sessionId) || active;
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
          data: { previous_session_id: sessionId },
        },
      ],
    };

    // Save new session
    await this.create(newSession);

    // Remove from archive
    this.expiredArchive.delete(sessionId);
    this.sessions.delete(sessionId);

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
   * Archive an expired session
   */
  private async archiveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'expired';
      this.expiredArchive.set(sessionId, session);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(async () => {
      const cleaned = await this.cleanup();
      if (cleaned > 0) {
        console.log(`🧹 Builder session cleanup: ${cleaned} sessions archived/removed`);
      }
    }, BUILDER_CONSTANTS.CLEANUP_INTERVAL_MS);

    // Don't prevent process exit
    this.cleanupTimer.unref();
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Get stats (for debugging)
   */
  getStats(): { active: number; expired: number } {
    return {
      active: this.sessions.size,
      expired: this.expiredArchive.size,
    };
  }
}

// Singleton instance
let sessionStoreInstance: InMemorySessionStore | null = null;

// Session store type for factory
type SessionStoreType = 'memory' | 'redis';

export function getSessionStore(): InMemorySessionStore {
  if (!sessionStoreInstance) {
    sessionStoreInstance = new InMemorySessionStore();
  }
  return sessionStoreInstance;
}

// For testing - reset the store
export function resetSessionStore(): void {
  if (sessionStoreInstance) {
    sessionStoreInstance.stopCleanup();
  }
  sessionStoreInstance = null;
}

export { SessionStoreType };
