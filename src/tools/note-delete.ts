import { ExecutionMetadata, createMetadataFromStart } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';
import { deleteNote, findNote } from '../helpers/note-crud.js';

export interface NoteDeleteInput {
  workflow_id: string;
  note_name: string;
}

export interface NoteDeleteOutput {
  success: boolean;
  deleted_note: {
    name: string;
    type: string;
  };
  workflow: {
    id: string;
    name: string;
  };
  meta: ExecutionMetadata;
}

/**
 * Delete a documentation note (sticky note) from a workflow
 *
 * Phase 1.5 Tool: Exposes note-crud helpers via MCP
 *
 * Use cases:
 * - Remove outdated documentation
 * - Clean up test notes
 * - Replace old notes with updated versions
 *
 * Warning: This operation cannot be undone.
 * The note will be permanently removed from the workflow.
 */
export async function noteDelete(
  client: N8NClient,
  input: NoteDeleteInput
): Promise<NoteDeleteOutput> {
  const startTime = Date.now();

  // Get note info before deletion (for confirmation)
  const noteToDelete = await findNote(client, {
    workflowId: input.workflow_id,
    noteName: input.note_name,
  });

  if (!noteToDelete) {
    throw new Error(`Note "${input.note_name}" not found in workflow`);
  }

  // Delete note using helper
  await deleteNote(client, {
    workflowId: input.workflow_id,
    noteName: input.note_name,
  });

  // Get workflow info
  const workflow = await client.getWorkflow(input.workflow_id);

  // Build response
  const meta = createMetadataFromStart(startTime, '1.3.1');

  return {
    success: true,
    deleted_note: {
      name: noteToDelete.name,
      type: noteToDelete.type,
    },
    workflow: {
      id: workflow.id,
      name: workflow.name,
    },
    meta,
  };
}
