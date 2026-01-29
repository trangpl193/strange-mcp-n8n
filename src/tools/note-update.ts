import { ExecutionMetadata, createMetadataFromStart } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';
import { updateNote, findNote } from '../helpers/note-crud.js';

export interface NoteUpdateInput {
  workflow_id: string;
  note_name: string;
  content?: string;
  height?: number;
  width?: number;
}

export interface NoteUpdateOutput {
  success: boolean;
  note: {
    name: string;
    updated_fields: string[];
    size: {
      width: number;
      height: number;
    };
    content_length: number;
  };
  workflow: {
    id: string;
    name: string;
  };
  meta: ExecutionMetadata;
}

/**
 * Update an existing documentation note (sticky note)
 *
 * Phase 1.5 Tool: Exposes note-crud helpers via MCP
 *
 * Use cases:
 * - Append changelog entries
 * - Update usage instructions
 * - Refine architecture documentation
 * - Resize notes
 *
 * Parameters are MERGED with existing.
 * Only specified fields will be updated.
 */
export async function noteUpdate(
  client: N8NClient,
  input: NoteUpdateInput
): Promise<NoteUpdateOutput> {
  const startTime = Date.now();

  // Track what fields are being updated
  const updatedFields: string[] = [];
  if (input.content !== undefined) updatedFields.push('content');
  if (input.height !== undefined) updatedFields.push('height');
  if (input.width !== undefined) updatedFields.push('width');

  // Update note using helper
  await updateNote(client, {
    workflowId: input.workflow_id,
    noteName: input.note_name,
    content: input.content,
    height: input.height,
    width: input.width,
  });

  // Get updated note to return current state
  const updatedNote = await findNote(client, {
    workflowId: input.workflow_id,
    noteName: input.note_name,
  });

  if (!updatedNote) {
    throw new Error(`Note "${input.note_name}" not found after update`);
  }

  // Get workflow info
  const workflow = await client.getWorkflow(input.workflow_id);

  // Build response
  const meta = createMetadataFromStart(startTime, '1.3.1');

  return {
    success: true,
    note: {
      name: updatedNote.name,
      updated_fields: updatedFields,
      size: {
        width: updatedNote.parameters.width || 400,
        height: updatedNote.parameters.height || 300,
      },
      content_length: updatedNote.parameters.content.length,
    },
    workflow: {
      id: workflow.id,
      name: workflow.name,
    },
    meta,
  };
}
