/**
 * builder_list - List all pending builder sessions (Discovery Tool)
 *
 * This tool solves the "Blind Box Problem" - when an AI agent starts
 * a new session, it needs to discover any pending drafts from previous sessions.
 */

import { getUnifiedSessionStore } from '../services/session-store-factory.js';
import type {
  BuilderListInput,
  BuilderListOutput,
} from '../services/builder-types.js';

export async function builderList(
  input: BuilderListInput
): Promise<BuilderListOutput> {
  const store = getUnifiedSessionStore();

  const drafts = await store.getSummaries(input.include_expired ?? true);

  // Filter out committed sessions
  const pendingDrafts = drafts.filter((d) => d.status !== 'committed');

  return {
    drafts: pendingDrafts,
    total: pendingDrafts.length,
  };
}
