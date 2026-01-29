/**
 * Integration Tests for Builder Pattern with Notes (Phase 2)
 *
 * Tests:
 * - builder_add_node with stickyNote type
 * - Template expansion in builder
 * - Mixed nodes (regular + notes)
 * - Position calculation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { N8NClient } from '../../src/services/n8n-client.js';
import { builderStart } from '../../src/tools/builder-start.js';
import { builderAddNode } from '../../src/tools/builder-add-node.js';
import { builderConnect } from '../../src/tools/builder-connect.js';
import { builderCommit } from '../../src/tools/builder-commit.js';
import { builderDiscard } from '../../src/tools/builder-discard.js';

// Skip if no API credentials
const RUN_INTEGRATION = process.env.N8N_API_KEY !== undefined && process.env.N8N_URL !== undefined;

describe.skipIf(!RUN_INTEGRATION)('Builder Pattern with Notes Integration Tests', () => {
  let client: N8NClient;
  let sessionId: string | undefined;
  let workflowId: string | undefined;

  beforeEach(() => {
    client = new N8NClient(process.env.N8N_URL!, process.env.N8N_API_KEY!);
  });

  afterEach(async () => {
    // Cleanup: discard session if not committed
    if (sessionId) {
      try {
        await builderDiscard(client, { session_id: sessionId });
      } catch (error) {
        // Session might already be committed/discarded
      }
      sessionId = undefined;
    }

    // Cleanup: delete workflow if created
    if (workflowId) {
      try {
        await client.deleteWorkflow(workflowId);
      } catch (error) {
        console.error('Workflow cleanup failed:', error);
      }
      workflowId = undefined;
    }
  });

  describe('builder_add_node with stickyNote', () => {
    test('should add stickyNote with custom content', async () => {
      const session = await builderStart(client, {
        name: 'Builder Note Test - Custom',
      });
      sessionId = session.session_id;

      const result = await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          config: {
            content: '## Test Note\n\nThis is a custom note.',
            height: 300,
            width: 400,
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.node_name).toBe('Note');
      expect(result.nodes_count).toBe(1);
    });

    test('should add stickyNote with changelog template', async () => {
      const session = await builderStart(client, {
        name: 'Builder Note Test - Changelog',
      });
      sessionId = session.session_id;

      const result = await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Changelog',
          config: {
            template: 'changelog',
            template_variables: {
              workflow_name: 'Builder Test Workflow',
              created_date: '2026-01-29',
              version: '1.0.0',
              date: '2026-01-29',
              change_description: 'Created via builder pattern',
              author: 'Integration Test',
              reason: 'Testing template expansion in builder',
            },
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.node_name).toBe('Changelog');
      expect(result.nodes_count).toBe(1);
    });

    test('should add stickyNote with usage template', async () => {
      const session = await builderStart(client, {
        name: 'Builder Note Test - Usage',
      });
      sessionId = session.session_id;

      const result = await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Usage Instructions',
          config: {
            template: 'usage',
            template_variables: {
              workflow_name: 'Builder Test',
              trigger_type: 'Manual',
              trigger_config: 'None',
              input_format: 'None',
              output_format: 'JSON',
              error_handling: 'Default',
            },
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.node_name).toBe('Usage Instructions');
    });

    test('should add stickyNote with architecture template', async () => {
      const session = await builderStart(client, {
        name: 'Builder Note Test - Architecture',
      });
      sessionId = session.session_id;

      const result = await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Architecture Decision',
          config: {
            template: 'architecture',
            template_variables: {
              decision_title: 'Use Builder Pattern',
              context: 'Need systematic workflow creation',
              decision: 'Use builder pattern for all new workflows',
              consequences_positive: 'Consistent, validated workflows',
              consequences_negative: 'Slightly more verbose API',
              alternatives: 'Direct workflow_update calls',
            },
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.node_name).toBe('Architecture Decision');
    });
  });

  describe('Mixed Nodes - Regular + Notes', () => {
    test('should create workflow with trigger, action, and documentation note', async () => {
      const session = await builderStart(client, {
        name: 'Mixed Nodes Test',
      });
      sessionId = session.session_id;

      // Add manual trigger
      await builderAddNode(client, {
        session_id: sessionId,
        node: { type: 'manual' },
      });

      // Add documentation note
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Documentation',
          config: {
            content: '## Workflow Purpose\n\nThis workflow demonstrates mixed nodes.',
          },
        },
      });

      // Add respond node
      const addResult = await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'respond',
          config: { statusCode: 200 },
        },
      });

      expect(addResult.nodes_count).toBe(3);

      // Connect trigger to respond (notes are not connected)
      await builderConnect(client, {
        session_id: sessionId,
        from_node: 'When clicking \'Test workflow\'',
        to_node: 'Respond to Webhook',
      });

      // Commit workflow
      const commitResult = await builderCommit(client, {
        session_id: sessionId,
        activate: false,
      });

      expect(commitResult.success).toBe(true);
      expect(commitResult.workflow.nodes).toHaveLength(3);

      // Verify note is in workflow
      const noteNode = commitResult.workflow.nodes.find(n => n.type === 'n8n-nodes-base.stickyNote');
      expect(noteNode).toBeDefined();
      expect(noteNode!.name).toBe('Documentation');

      workflowId = commitResult.workflow.id;
      sessionId = undefined; // Session auto-closed on commit
    });

    test('should create workflow with multiple notes at different stages', async () => {
      const session = await builderStart(client, {
        name: 'Multiple Notes Test',
      });
      sessionId = session.session_id;

      // Add overview note
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Overview',
          config: {
            content: '## Workflow Overview\n\nMulti-stage workflow with documentation.',
            position: [100, 50], // Above workflow
          },
        },
      });

      // Add webhook trigger
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'webhook',
          config: { path: '/test' },
        },
      });

      // Add section note
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Processing Section',
          config: {
            content: '## Data Processing\n\nThis section handles data validation.',
          },
        },
      });

      // Add code node
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'code',
          config: {
            code: 'return [{ json: { processed: true } }];',
          },
        },
      });

      // Add troubleshooting note
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Troubleshooting',
          config: {
            content: '## Debugging Notes\n\nCheck logs if processing fails.',
            position: [100, 600], // Below workflow
          },
        },
      });

      // Add respond
      const addResult = await builderAddNode(client, {
        session_id: sessionId,
        node: { type: 'respond' },
      });

      expect(addResult.nodes_count).toBe(6); // 3 notes + 3 functional nodes

      // Connect functional nodes
      await builderConnect(client, {
        session_id: sessionId,
        from_node: 'Webhook',
        to_node: 'Code',
      });

      await builderConnect(client, {
        session_id: sessionId,
        from_node: 'Code',
        to_node: 'Respond to Webhook',
      });

      // Commit
      const commitResult = await builderCommit(client, {
        session_id: sessionId,
        activate: false,
      });

      expect(commitResult.success).toBe(true);

      // Verify all notes present
      const notes = commitResult.workflow.nodes.filter(n => n.type === 'n8n-nodes-base.stickyNote');
      expect(notes).toHaveLength(3);
      expect(notes.map(n => n.name)).toContain('Overview');
      expect(notes.map(n => n.name)).toContain('Processing Section');
      expect(notes.map(n => n.name)).toContain('Troubleshooting');

      workflowId = commitResult.workflow.id;
      sessionId = undefined;
    });
  });

  describe('Position Calculation', () => {
    test('should auto-calculate position when not specified', async () => {
      const session = await builderStart(client, {
        name: 'Auto Position Test',
      });
      sessionId = session.session_id;

      // Add multiple notes without specifying position
      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Note 1',
          config: { content: '## Note 1' },
        },
      });

      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          name: 'Note 2',
          config: { content: '## Note 2' },
        },
      });

      const commitResult = await builderCommit(client, {
        session_id: sessionId,
        activate: false,
      });

      const notes = commitResult.workflow.nodes.filter(n => n.type === 'n8n-nodes-base.stickyNote');
      expect(notes).toHaveLength(2);

      // Verify positions are different (auto-calculated)
      const pos1 = notes[0].position;
      const pos2 = notes[1].position;
      expect(pos1).not.toEqual(pos2);

      workflowId = commitResult.workflow.id;
      sessionId = undefined;
    });

    test('should respect manual position when specified', async () => {
      const session = await builderStart(client, {
        name: 'Manual Position Test',
      });
      sessionId = session.session_id;

      await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          config: {
            content: '## Positioned Note',
            position: [500, 300],
          },
        },
      });

      const commitResult = await builderCommit(client, {
        session_id: sessionId,
        activate: false,
      });

      const note = commitResult.workflow.nodes.find(n => n.type === 'n8n-nodes-base.stickyNote');
      expect(note!.position).toEqual([500, 300]);

      workflowId = commitResult.workflow.id;
      sessionId = undefined;
    });
  });

  describe('Schema Validation', () => {
    test('should validate note parameters via schema', async () => {
      const session = await builderStart(client, {
        name: 'Schema Validation Test',
      });
      sessionId = session.session_id;

      // This should work - valid parameters
      const result = await builderAddNode(client, {
        session_id: sessionId,
        node: {
          type: 'stickyNote',
          config: {
            content: '## Valid Note',
            height: 300,
            width: 400,
          },
        },
      });

      expect(result.success).toBe(true);

      // Clean up without committing
      await builderDiscard(client, { session_id: sessionId });
      sessionId = undefined;
    });
  });
});
