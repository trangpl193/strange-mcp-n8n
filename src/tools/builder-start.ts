/**
 * builder_start - Initialize a new builder session
 *
 * Creates a new draft workflow session for step-by-step building.
 */

import { createMetadataFromStart } from '@strange/mcp-core';
import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import type {
  BuilderSession,
  BuilderStartInput,
  BuilderStartOutput,
} from '../services/builder-types.js';
import { BUILDER_CONSTANTS } from '../services/builder-types.js';

export async function builderStart(
  input: BuilderStartInput
): Promise<BuilderStartOutput> {
  const startTime = Date.now();
  const store = getUnifiedSessionStore();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + BUILDER_CONSTANTS.SESSION_TTL_MS);

  const session: BuilderSession = {
    session_id: store.generateSessionId(),
    name: input.name,
    status: 'active',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    workflow_draft: {
      name: input.name,
      description: input.description,
      nodes: [],
      connections: [],
      settings: {
        executionOrder: 'v1',
      },
    },
    operations_log: [
      {
        operation: 'session_started',
        timestamp: now.toISOString(),
        details: { name: input.name },
      },
    ],
    credentials: new Map(Object.entries(input.credentials || {})),
  };

  await store.create(session);

  const ttlSeconds = Math.floor(BUILDER_CONSTANTS.SESSION_TTL_MS / 1000);

  return {
    session_id: session.session_id,
    name: session.name,
    expires_at: session.expires_at,
    ttl_seconds: ttlSeconds,
    message: `Builder session created. Use builder_add_node to add nodes. Session expires in ${ttlSeconds / 60} minutes.`,
  };
}
