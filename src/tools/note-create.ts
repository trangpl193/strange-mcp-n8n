import { ExecutionMetadata, createMetadataFromStart } from '@trangpl193/mcp-core';
import { N8NClient } from '../services/index.js';
import { createNote, loadTemplate, fillTemplate } from '../helpers/note-crud.js';

export interface NoteCreateInput {
  workflow_id: string;
  name?: string;
  template?: 'changelog' | 'usage' | 'architecture';
  template_variables?: Record<string, string>;
  content?: string;
  position?: [number, number];
  height?: number;
  width?: number;
}

export interface NoteCreateOutput {
  success: boolean;
  note: {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    size: {
      width: number;
      height: number;
    };
    content_preview: string;
  };
  workflow: {
    id: string;
    name: string;
  };
  meta: ExecutionMetadata;
}

/**
 * Create a documentation note (sticky note) in a workflow
 *
 * Phase 1.5 Tool: Exposes note-crud helpers via MCP
 *
 * Use cases:
 * - Add changelog note when creating workflows
 * - Add usage instructions for complex workflows
 * - Document architecture decisions
 *
 * Templates available:
 * - changelog: Version history tracking
 * - usage: Usage instructions and examples
 * - architecture: Design decisions and trade-offs
 *
 * If no template specified, use `content` parameter directly.
 */
export async function noteCreate(
  client: N8NClient,
  input: NoteCreateInput
): Promise<NoteCreateOutput> {
  const startTime = Date.now();

  // Determine content: template or direct
  let noteContent: string;
  if (input.template && input.template_variables) {
    const template = loadTemplate(input.template);
    noteContent = fillTemplate(template, input.template_variables);
  } else if (input.content) {
    noteContent = input.content;
  } else {
    throw new Error('Either template+template_variables or content must be provided');
  }

  // Create note using helper
  const note = await createNote(client, {
    workflowId: input.workflow_id,
    name: input.name,
    content: noteContent,
    position: input.position,
    height: input.height,
    width: input.width,
  });

  // Get workflow info for response
  const workflow = await client.getWorkflow(input.workflow_id);

  // Build response
  const meta = createMetadataFromStart(startTime, '1.3.1');

  return {
    success: true,
    note: {
      id: note.id,
      name: note.name,
      type: note.type,
      position: note.position,
      size: {
        width: note.parameters.width || 400,
        height: note.parameters.height || 300,
      },
      content_preview: note.parameters.content.substring(0, 100) + '...',
    },
    workflow: {
      id: workflow.id,
      name: workflow.name,
    },
    meta,
  };
}
