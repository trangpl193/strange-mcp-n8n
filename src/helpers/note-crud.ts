/**
 * Note CRUD Helper Functions
 * Phase 1: Quick win implementation using workflow_update for create
 * Phase 2: Will migrate to builder pattern
 */

import { v4 as uuidv4 } from 'uuid';
import { N8NClient } from '../services/index.js';
import type { N8NWorkflow, N8NNode } from '../types.js';

export interface StickyNoteNode {
  id: string;
  name: string;
  type: 'n8n-nodes-base.stickyNote';
  typeVersion: 1;
  position: [number, number];
  parameters: {
    content: string;
    height?: number;
    width?: number;
  };
}

export interface CreateNoteOptions {
  workflowId: string;
  name?: string;
  content: string;
  position?: [number, number];
  height?: number;
  width?: number;
}

export interface UpdateNoteOptions {
  workflowId: string;
  noteName: string;
  content?: string;
  height?: number;
  width?: number;
}

export interface FindNoteOptions {
  workflowId: string;
  noteName: string;
}

export interface DeleteNoteOptions {
  workflowId: string;
  noteName: string;
}

/**
 * Create a new sticky note in a workflow
 * Phase 1: Uses workflow_update with direct nodes manipulation
 */
export async function createNote(
  client: N8NClient,
  options: CreateNoteOptions
): Promise<StickyNoteNode> {
  // Get current workflow
  const workflow: N8NWorkflow = await client.getWorkflow(options.workflowId);

  // Calculate position (default: top-left corner with offset)
  const position: [number, number] = options.position || calculateDefaultPosition(workflow);

  // Generate note node
  const noteNode: StickyNoteNode = {
    id: uuidv4(),
    name: options.name || 'Note',
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position,
    parameters: {
      content: options.content,
      height: options.height || 300,
      width: options.width || 400,
    },
  };

  // Add note to workflow nodes
  const updatedNodes = [...(workflow.nodes || []), noteNode];

  // Update workflow via N8N API
  await client.updateWorkflow(options.workflowId, {
    nodes: updatedNodes,
  });

  return noteNode;
}

/**
 * Update an existing sticky note
 * Uses node_update pattern (validated in testing)
 */
export async function updateNote(
  client: N8NClient,
  options: UpdateNoteOptions
): Promise<void> {
  // Get current workflow
  const workflow: N8NWorkflow = await client.getWorkflow(options.workflowId);

  // Find the note node
  const noteNode = workflow.nodes?.find(
    (n: N8NNode) => n.name === options.noteName && n.type === 'n8n-nodes-base.stickyNote'
  );

  if (!noteNode) {
    throw new Error(`Note "${options.noteName}" not found in workflow`);
  }

  // Build updated parameters (merge with existing)
  const updatedParameters: any = { ...noteNode.parameters };
  if (options.content !== undefined) updatedParameters.content = options.content;
  if (options.height !== undefined) updatedParameters.height = options.height;
  if (options.width !== undefined) updatedParameters.width = options.width;

  // Update workflow with modified note
  const updatedNodes = workflow.nodes!.map((n: N8NNode) =>
    n.name === options.noteName && n.type === 'n8n-nodes-base.stickyNote'
      ? { ...n, parameters: updatedParameters }
      : n
  );

  await client.updateWorkflow(options.workflowId, {
    nodes: updatedNodes,
  });
}

/**
 * Find a sticky note by name
 */
export async function findNote(
  client: N8NClient,
  options: FindNoteOptions
): Promise<StickyNoteNode | null> {
  const workflow: N8NWorkflow = await client.getWorkflow(options.workflowId);

  const noteNode = workflow.nodes?.find(
    (n: N8NNode) => n.name === options.noteName && n.type === 'n8n-nodes-base.stickyNote'
  );

  return noteNode ? (noteNode as StickyNoteNode) : null;
}

/**
 * Delete a sticky note from workflow
 */
export async function deleteNote(
  client: N8NClient,
  options: DeleteNoteOptions
): Promise<void> {
  const workflow: N8NWorkflow = await client.getWorkflow(options.workflowId);

  // Filter out the note to delete
  const updatedNodes = workflow.nodes?.filter(
    (n: N8NNode) => !(n.name === options.noteName && n.type === 'n8n-nodes-base.stickyNote')
  );

  if (updatedNodes?.length === workflow.nodes?.length) {
    throw new Error(`Note "${options.noteName}" not found in workflow`);
  }

  await client.updateWorkflow(options.workflowId, {
    nodes: updatedNodes,
  });
}

/**
 * Calculate default position for new note
 * Strategy: Place in top-left corner with offset from existing notes
 */
function calculateDefaultPosition(workflow: N8NWorkflow): [number, number] {
  // Default top-left position
  let defaultX = -100;
  let defaultY = -100;

  // Check if there are existing sticky notes
  const existingNotes = workflow.nodes?.filter(
    (n: N8NNode) => n.type === 'n8n-nodes-base.stickyNote'
  );

  if (existingNotes && existingNotes.length > 0) {
    // Offset from the last note
    const lastNote = existingNotes[existingNotes.length - 1];
    defaultX = lastNote.position[0] + 50; // Offset right
    defaultY = lastNote.position[1] + 50; // Offset down
  }

  return [defaultX, defaultY];
}

/**
 * Load template content from templates directory
 * Returns template string with placeholders for variable substitution
 */
export function loadTemplate(templateName: 'changelog' | 'usage' | 'architecture'): string {
  // In Phase 1, templates are external .md files
  // In practice, this would use fs.readFileSync or import
  // For now, return basic templates inline

  const templates = {
    changelog: `## 📋 Changelog

**Workflow**: {{workflow_name}}
**Created**: {{created_date}}

### v1.0 - {{date}}
- Initial version
- {{changes}}

*Generated by MCP N8N tools*`,

    usage: `## 📖 Usage Instructions

**Workflow**: {{workflow_name}}

**Trigger**: {{trigger_type}}
**Purpose**: {{purpose}}

**Inputs**: {{inputs}}
**Outputs**: {{outputs}}

*Updated: {{updated_date}}*`,

    architecture: `## 🏗️ Architecture

**Workflow**: {{workflow_name}}

**Purpose**: {{purpose}}
**Approach**: {{approach}}

**Key Decisions**:
- {{decision_1}}
- {{decision_2}}

**Trade-offs**: {{tradeoffs}}

*Architecture by: {{architect}}*`,
  };

  return templates[templateName];
}

/**
 * Simple template variable substitution
 * Replaces {{variable}} with provided values
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
