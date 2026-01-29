/**
 * Integration Tests for Note CRUD (Phase 1 + 1.5)
 *
 * Tests:
 * - note_create with templates
 * - note_update
 * - note_delete
 * - Full CRUD cycle
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { N8NClient } from '../../src/services/n8n-client.js';
import { workflowCreate } from '../../src/tools/workflow-create.js';
import { workflowGet } from '../../src/tools/workflow-get.js';
import { noteCreate } from '../../src/tools/note-create.js';
import { noteUpdate } from '../../src/tools/note-update.js';
import { noteDelete } from '../../src/tools/note-delete.js';

// Skip if no API credentials
const RUN_INTEGRATION = process.env.N8N_API_KEY !== undefined && process.env.N8N_URL !== undefined;

describe.skipIf(!RUN_INTEGRATION)('Note CRUD Integration Tests', () => {
  let client: N8NClient;
  let testWorkflowId: string;

  beforeAll(async () => {
    client = new N8NClient(process.env.N8N_URL!, process.env.N8N_API_KEY!);

    // Create test workflow
    const result = await workflowCreate(client, {
      workflow: {
        name: 'Note CRUD Test Workflow',
        steps: [{ type: 'manual' }],
      },
    });
    testWorkflowId = result.workflow_id;
  });

  afterAll(async () => {
    // Cleanup: delete test workflow
    if (testWorkflowId) {
      try {
        await client.deleteWorkflow(testWorkflowId);
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
  });

  describe('note_create', () => {
    test('should create note with changelog template', async () => {
      const result = await noteCreate(client, {
        workflow_id: testWorkflowId,
        template: 'changelog',
        template_variables: {
          workflow_name: 'Note CRUD Test',
          created_date: '2026-01-29',
          version: '1.0.0',
          date: '2026-01-29',
          change_description: 'Initial test workflow creation',
          author: 'Integration Test',
          reason: 'Testing note CRUD functionality',
        },
      });

      expect(result.success).toBe(true);
      expect(result.note.name).toBe('Note');
      expect(result.note.type).toBe('n8n-nodes-base.stickyNote');
      expect(result.note.parameters.content).toContain('Changelog');
      expect(result.note.parameters.content).toContain('Note CRUD Test');
      expect(result.note.parameters.content).toContain('1.0.0');
    });

    test('should create note with usage template', async () => {
      const result = await noteCreate(client, {
        workflow_id: testWorkflowId,
        name: 'Usage Documentation',
        template: 'usage',
        template_variables: {
          workflow_name: 'Note CRUD Test',
          trigger_type: 'Manual',
          trigger_config: 'None',
          input_format: 'None',
          output_format: 'JSON',
          error_handling: 'Default N8N error handling',
        },
      });

      expect(result.success).toBe(true);
      expect(result.note.name).toBe('Usage Documentation');
      expect(result.note.parameters.content).toContain('Usage Instructions');
    });

    test('should create note with architecture template', async () => {
      const result = await noteCreate(client, {
        workflow_id: testWorkflowId,
        name: 'Architecture Note',
        template: 'architecture',
        template_variables: {
          decision_title: 'Use manual trigger for testing',
          context: 'Integration tests require controlled execution',
          decision: 'Use manual trigger instead of webhook',
          consequences_positive: 'Easier to test, no external dependencies',
          consequences_negative: 'Not suitable for production automation',
          alternatives: 'Webhook trigger, Schedule trigger',
        },
      });

      expect(result.success).toBe(true);
      expect(result.note.name).toBe('Architecture Note');
      expect(result.note.parameters.content).toContain('Architecture Decision');
    });

    test('should create note with custom content', async () => {
      const result = await noteCreate(client, {
        workflow_id: testWorkflowId,
        name: 'Custom Note',
        content: '## Custom Content\n\nThis is a test note with custom content.',
        height: 250,
        width: 350,
      });

      expect(result.success).toBe(true);
      expect(result.note.name).toBe('Custom Note');
      expect(result.note.parameters.content).toBe('## Custom Content\n\nThis is a test note with custom content.');
      expect(result.note.parameters.height).toBe(250);
      expect(result.note.parameters.width).toBe(350);
    });

    test('should fail when neither template nor content provided', async () => {
      await expect(async () => {
        await noteCreate(client, {
          workflow_id: testWorkflowId,
        });
      }).rejects.toThrow();
    });
  });

  describe('note_update', () => {
    test('should update note content', async () => {
      const result = await noteUpdate(client, {
        workflow_id: testWorkflowId,
        note_name: 'Note',
        content: '## Updated Changelog\n\n### Version 1.1.0\n- Added note update functionality',
      });

      expect(result.success).toBe(true);
      expect(result.note.parameters.content).toContain('Updated Changelog');
      expect(result.note.parameters.content).toContain('1.1.0');
    });

    test('should update note dimensions', async () => {
      const result = await noteUpdate(client, {
        workflow_id: testWorkflowId,
        note_name: 'Custom Note',
        height: 400,
        width: 500,
      });

      expect(result.success).toBe(true);
      expect(result.note.parameters.height).toBe(400);
      expect(result.note.parameters.width).toBe(500);
    });

    test('should update both content and dimensions', async () => {
      const result = await noteUpdate(client, {
        workflow_id: testWorkflowId,
        note_name: 'Usage Documentation',
        content: '## Updated Usage\n\nNew instructions here.',
        height: 350,
        width: 450,
      });

      expect(result.success).toBe(true);
      expect(result.note.parameters.content).toContain('Updated Usage');
      expect(result.note.parameters.height).toBe(350);
      expect(result.note.parameters.width).toBe(450);
    });

    test('should fail when note not found', async () => {
      await expect(async () => {
        await noteUpdate(client, {
          workflow_id: testWorkflowId,
          note_name: 'NonExistent Note',
          content: 'Should fail',
        });
      }).rejects.toThrow(/not found/i);
    });
  });

  describe('note_delete', () => {
    test('should delete note', async () => {
      // First verify note exists
      let workflow = await workflowGet(client, { workflow_id: testWorkflowId });
      const notesBefore = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.stickyNote');
      const hasCustomNote = notesBefore.some(n => n.name === 'Custom Note');
      expect(hasCustomNote).toBe(true);

      // Delete note
      const result = await noteDelete(client, {
        workflow_id: testWorkflowId,
        note_name: 'Custom Note',
      });

      expect(result.success).toBe(true);
      expect(result.deleted_note.name).toBe('Custom Note');

      // Verify note is gone
      workflow = await workflowGet(client, { workflow_id: testWorkflowId });
      const notesAfter = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.stickyNote');
      const stillHasCustomNote = notesAfter.some(n => n.name === 'Custom Note');
      expect(stillHasCustomNote).toBe(false);
      expect(notesAfter.length).toBe(notesBefore.length - 1);
    });

    test('should fail when note not found', async () => {
      await expect(async () => {
        await noteDelete(client, {
          workflow_id: testWorkflowId,
          note_name: 'Already Deleted Note',
        });
      }).rejects.toThrow(/not found/i);
    });
  });

  describe('Full CRUD Cycle', () => {
    test('should support complete create → read → update → delete cycle', async () => {
      // CREATE
      const createResult = await noteCreate(client, {
        workflow_id: testWorkflowId,
        name: 'Lifecycle Test',
        content: '## Initial Content\n\nVersion 1.0',
        height: 300,
        width: 400,
      });
      expect(createResult.success).toBe(true);

      // READ
      let workflow = await workflowGet(client, { workflow_id: testWorkflowId });
      let lifecycleNote = workflow.nodes.find(n => n.name === 'Lifecycle Test');
      expect(lifecycleNote).toBeDefined();
      expect(lifecycleNote!.parameters.content).toContain('Initial Content');

      // UPDATE
      const updateResult = await noteUpdate(client, {
        workflow_id: testWorkflowId,
        note_name: 'Lifecycle Test',
        content: '## Updated Content\n\nVersion 2.0',
        height: 350,
      });
      expect(updateResult.success).toBe(true);

      // READ again
      workflow = await workflowGet(client, { workflow_id: testWorkflowId });
      lifecycleNote = workflow.nodes.find(n => n.name === 'Lifecycle Test');
      expect(lifecycleNote!.parameters.content).toContain('Updated Content');
      expect(lifecycleNote!.parameters.height).toBe(350);

      // DELETE
      const deleteResult = await noteDelete(client, {
        workflow_id: testWorkflowId,
        note_name: 'Lifecycle Test',
      });
      expect(deleteResult.success).toBe(true);

      // READ final - note should be gone
      workflow = await workflowGet(client, { workflow_id: testWorkflowId });
      lifecycleNote = workflow.nodes.find(n => n.name === 'Lifecycle Test');
      expect(lifecycleNote).toBeUndefined();
    });
  });
});
