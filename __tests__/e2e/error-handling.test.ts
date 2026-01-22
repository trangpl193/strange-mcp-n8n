/**
 * E2E Test: Error Handling and Edge Cases (Simplified)
 *
 * Tests resilience and error handling across MCP tools - simplified version with key scenarios
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { builderStart } from '../../src/tools/builder-start.js';
import { builderAddNode } from '../../src/tools/builder-add-node.js';
import { builderCommit } from '../../src/tools/builder-commit.js';
import { workflowCreate } from '../../src/tools/workflow-create.js';
import { workflowUpdate } from '../../src/tools/workflow-update.js';
import { N8NClient } from '../../src/services/n8n-client.js';
import { getUnifiedSessionStore } from '../../src/services/session-store-factory.js';
import { loadConfig } from '../../src/config.js';

const RUN_E2E = process.env.N8N_API_KEY !== undefined && process.env.N8N_URL !== undefined;

const describeE2E = RUN_E2E ? describe : describe.skip;

describeE2E('E2E: Error Handling and Edge Cases', () => {
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
        // Ignore cleanup errors
      }
    }
  });

  beforeEach(async () => {
    const store = getUnifiedSessionStore();
    const sessions = await store.list(false);
    for (const session of sessions) {
      await store.delete(session.session_id);
    }
  });

  describe('Validation Errors', () => {
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

    test('should reject builder session with invalid node type', async () => {
      const startResult = await builderStart({ name: 'Test' });

      await expect(
        builderAddNode({
          session_id: startResult.session_id,
          node: { type: 'invalid_type' as any },
        })
      ).rejects.toThrow();
    });

    test('should reject commit without trigger node', async () => {
      const startResult = await builderStart({ name: 'Test' });

      await builderAddNode({
        session_id: startResult.session_id,
        node: { type: 'code' },
      });

      await expect(
        builderCommit(client, {
          session_id: startResult.session_id,
        })
      ).rejects.toThrow();
    });
  });

  describe('State Errors', () => {
    test('should reject operations on non-existent session', async () => {
      await expect(
        builderAddNode({
          session_id: 'non-existent',
          node: { type: 'webhook' },
        })
      ).rejects.toThrow();
    });

    test('should reject update to deleted workflow', async () => {
      const createResult = await workflowCreate(client, {
        workflow: {
          name: 'To Delete',
          steps: [
            { type: 'manual' },
            { type: 'respond' },
          ],
        },
      });

      await client.deleteWorkflow(createResult.workflow_id);

      await expect(
        workflowUpdate(client, {
          workflow_id: createResult.workflow_id,
          rename: 'New Name',
        })
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in workflow name', async () => {
      const specialName = 'Test [E2E] (v2) - α β γ 🚀';

      const result = await workflowCreate(client, {
        workflow: {
          name: specialName,
          steps: [
            { type: 'manual' },
            { type: 'respond' },
          ],
        },
      });

      createdWorkflows.push(result.workflow_id);

      expect(result.name).toBe(specialName);
    });

    test('should handle workflow with many nodes', async () => {
      const startResult = await builderStart({ name: 'Large Workflow' });

      // Add 10 nodes
      for (let i = 0; i < 10; i++) {
        await builderAddNode({
          session_id: startResult.session_id,
          node: {
            type: i === 0 ? 'manual' : 'code',
            name: `Node${i}`,
            config: i > 0 ? { code: `return items; // ${i}` } : undefined,
          },
        });
      }

      const store = getUnifiedSessionStore();
      const session = await store.get(startResult.session_id);
      expect(session!.workflow_draft.nodes).toHaveLength(10);
    });

    test('should handle concurrent workflow creation', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        workflowCreate(client, {
          workflow: {
            name: `Concurrent Test ${i}`,
            steps: [
              { type: 'manual' },
              { type: 'respond' },
            ],
          },
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.workflow_id).toBeDefined();
        createdWorkflows.push(result.workflow_id);
      });

      // All workflows should be unique
      const ids = results.map((r) => r.workflow_id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });
});
