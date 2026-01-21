/**
 * builder_discard - Discard a builder session without committing
 *
 * Cleans up the session and removes the draft.
 */

import { McpError, McpErrorCode } from '@strange/mcp-core';
import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import type {
  BuilderDiscardInput,
  BuilderDiscardOutput,
} from '../services/builder-types.js';

export async function builderDiscard(
  input: BuilderDiscardInput
): Promise<BuilderDiscardOutput> {
  const store = getUnifiedSessionStore();
  const session = await store.get(input.session_id);

  if (!session) {
    // Session doesn't exist - that's fine, consider it discarded
    return {
      success: true,
      message: `Session '${input.session_id}' not found (may have already expired or been discarded)`,
    };
  }

  const nodesCount = session.workflow_draft.nodes.length;
  const sessionName = session.name;

  // Delete the session
  await store.delete(input.session_id);

  return {
    success: true,
    message: `Builder session '${sessionName}' discarded. ${nodesCount} nodes were in draft.`,
  };
}
