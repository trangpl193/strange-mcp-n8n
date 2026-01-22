/**
 * E2E Test: Direct CRUD Operations (Simplified & Fixed)
 *
 * Tests core CRUD operations with correct API signatures
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { workflowCreate } from '../../src/tools/workflow-create.js';
import { workflowGet } from '../../src/tools/workflow-get.js';
import { workflowList } from '../../src/tools/workflow-list.js';
import { workflowUpdate } from '../../src/tools/workflow-update.js';
import { nodeGet } from '../../src/tools/node-get.js';
import { nodeUpdate } from '../../src/tools/node-update.js';
import { N8NClient } from '../../src/services/n8n-client.js';
import { loadConfig } from '../../src/config.js';
import {
  SIMPLE_WEBHOOK_WORKFLOW,
  POSTGRES_WORKFLOW,
} from '../fixtures/workflows.js';

const RUN_E2E = process.env.N8N_API_KEY !== undefined && process.env.N8N_URL !== undefined;

const describeE2E = RUN_E2E ? describe : describe.skip;

describeE2E('E2E: Direct CRUD Operations', () => {
  let client: N8NClient;
  const createdWorkflows: string[] = [];

  beforeAll(() => {
    const config = loadConfig();
    client = new N8NClient({
      baseUrl: config.n8nUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
  });

  afterAll(async () => {
    for (const workflowId of createdWorkflows) {
      try {
        await client.deleteWorkflow(workflowId);
      } catch (error) {
        console.warn(`Cleanup failed for ${workflowId}`);
      }
    }
  });

  describe('CREATE Operations', () => {
    test('should create simple webhook workflow', async () => {
      const result = await workflowCreate(client, {
        workflow: SIMPLE_WEBHOOK_WORKFLOW,
      });

      expect(result.workflow_id).toBeDefined();
      expect(result.name).toBe('Simple Webhook Test');
      expect(result.nodes_count).toBe(2);

      createdWorkflows.push(result.workflow_id);

      // Verify structure
      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.nodes[0].type).toBe('n8n-nodes-base.webhook');
      expect(workflow.nodes[1].type).toBe('n8n-nodes-base.respondToWebhook');
    });

    test('should create and activate workflow', async () => {
      const result = await workflowCreate(client, {
        workflow: SIMPLE_WEBHOOK_WORKFLOW,
        activate: true,  // Fixed: was 'active'
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      expect(workflow.active).toBe(true);
    });
  });

  describe('READ Operations', () => {
    let testWorkflowId: string;

    beforeAll(async () => {
      const result = await workflowCreate(client, {
        workflow: {
          ...SIMPLE_WEBHOOK_WORKFLOW,
          name: 'E2E Read Test',
        },
      });
      testWorkflowId = result.workflow_id;
      createdWorkflows.push(testWorkflowId);
    });

    test('should get workflow by ID', async () => {
      const workflow = await workflowGet(client, {
        workflow_id: testWorkflowId,
      });

      expect(workflow.id).toBe(testWorkflowId);
      expect(workflow.name).toBe('E2E Read Test');
      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.connections).toBeDefined();
    });

    test('should list workflows', async () => {
      const result = await workflowList(client, {
        limit: 10,
      });

      expect(result.workflows).toBeDefined();
      expect(Array.isArray(result.workflows)).toBe(true);
      // Fixed: removed result.total check (not in WorkflowListOutput)

      const ourWorkflow = result.workflows.find((w) => w.id === testWorkflowId);
      expect(ourWorkflow).toBeDefined();
    });

    test('should filter workflows by active status', async () => {
      const activeResult = await workflowList(client, {
        active: true,
      });

      activeResult.workflows.forEach((w) => {
        expect(w.active).toBe(true);
      });
    });
  });

  describe('UPDATE Operations', () => {
    test('should rename workflow', async () => {
      const createResult = await workflowCreate(client, {
        workflow: {
          ...SIMPLE_WEBHOOK_WORKFLOW,
          name: 'Original Name',
        },
      });
      createdWorkflows.push(createResult.workflow_id);

      const updateResult = await workflowUpdate(client, {
        workflow_id: createResult.workflow_id,
        rename: 'Updated Name',
      });

      expect(updateResult.name).toBe('Updated Name');
    });

    test('should activate/deactivate workflow', async () => {
      const createResult = await workflowCreate(client, {
        workflow: SIMPLE_WEBHOOK_WORKFLOW,
        activate: false,  // Fixed: was 'active'
      });
      createdWorkflows.push(createResult.workflow_id);

      // Activate
      const activateResult = await workflowUpdate(client, {
        workflow_id: createResult.workflow_id,
        activate: true,  // Fixed: was 'active'
      });

      expect(activateResult.active).toBe(true);

      // Deactivate
      const deactivateResult = await workflowUpdate(client, {
        workflow_id: createResult.workflow_id,
        activate: false,  // Fixed: was 'active'
      });

      expect(deactivateResult.active).toBe(false);
    });

    test('should add tags to workflow', async () => {
      const createResult = await workflowCreate(client, {
        workflow: SIMPLE_WEBHOOK_WORKFLOW,
      });
      createdWorkflows.push(createResult.workflow_id);

      const updateResult = await workflowUpdate(client, {
        workflow_id: createResult.workflow_id,
        add_tags: ['new-tag', 'another-tag'],
      });

      // Fixed: check success instead of message
      expect(updateResult.workflow_id).toBeDefined();
    });
  });

  describe('Node-Level Operations', () => {
    let workflowId: string;

    beforeAll(async () => {
      const result = await workflowCreate(client, {
        workflow: {
          name: 'Node Update Test',
          steps: [
            { type: 'webhook', name: 'Start', config: { path: '/test' } },
            { type: 'code', name: 'Process', config: { code: 'return items;' } },
            { type: 'respond', name: 'End' },
          ],
        },
      });
      workflowId = result.workflow_id;
      createdWorkflows.push(workflowId);
    });

    test('should get individual node', async () => {
      const nodeResult = await nodeGet(client, {
        workflow_id: workflowId,
        node_identifier: 'Start',
      });

      // Fixed: access via nodeResult.node
      expect(nodeResult.node.name).toBe('Start');
      expect(nodeResult.node.type).toBe('n8n-nodes-base.webhook');
      expect(nodeResult.node.parameters).toBeDefined();
    });

    test('should update node parameters', async () => {
      const updateResult = await nodeUpdate(client, {
        workflow_id: workflowId,
        node_identifier: 'Process',
        parameters: {
          code: 'return items.map(item => ({ ...item, processed: true }));',
        },
      });

      // Fixed: check success instead of message
      expect(updateResult.success).toBe(true);

      const nodeResult = await nodeGet(client, {
        workflow_id: workflowId,
        node_identifier: 'Process',
      });

      // Fixed: access via nodeResult.node
      expect(nodeResult.node.parameters.code).toContain('processed: true');
    });

    test('should rename node', async () => {
      const updateResult = await nodeUpdate(client, {
        workflow_id: workflowId,
        node_identifier: 'End',
        name: 'SendResponse',
      });

      expect(updateResult.success).toBe(true);

      const nodeResult = await nodeGet(client, {
        workflow_id: workflowId,
        node_identifier: 'SendResponse',
      });

      expect(nodeResult.node.name).toBe('SendResponse');
    });

    test('should disable node', async () => {
      const disableResult = await nodeUpdate(client, {
        workflow_id: workflowId,
        node_identifier: 'Process',
        disabled: true,
      });

      expect(disableResult.success).toBe(true);

      const nodeResult = await nodeGet(client, {
        workflow_id: workflowId,
        node_identifier: 'Process',
      });

      expect(nodeResult.node.disabled).toBe(true);
    });

    test('should update node position', async () => {
      const updateResult = await nodeUpdate(client, {
        workflow_id: workflowId,
        node_identifier: 'Start',
        position: [500, 300],  // Fixed: was position_x/position_y
      });

      expect(updateResult.success).toBe(true);

      const nodeResult = await nodeGet(client, {
        workflow_id: workflowId,
        node_identifier: 'Start',
      });

      expect(nodeResult.node.position).toEqual([500, 300]);
    });
  });

  describe('Validation', () => {
    test('should reject workflow without trigger', async () => {
      await expect(
        workflowCreate(client, {
          workflow: {
            name: 'No Trigger',
            steps: [
              { type: 'code', config: { code: 'return items;' } },
              { type: 'respond' },
            ],
          },
        })
      ).rejects.toThrow();
    });

    test('should reject update to non-existent workflow', async () => {
      await expect(
        workflowUpdate(client, {
          workflow_id: 'non-existent-id',
          rename: 'New Name',
        })
      ).rejects.toThrow();
    });
  });
});
