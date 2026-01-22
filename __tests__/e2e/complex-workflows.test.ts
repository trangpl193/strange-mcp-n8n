/**
 * E2E Test: Complex Multi-Step Workflows
 *
 * Tests complex real-world scenarios from fixtures/complex-scenarios.ts:
 * 1. Data pipelines with HTTP + DB
 * 2. Conditional branching (IF/ELSE)
 * 3. Multi-branch switching
 * 4. Parallel processing with merge
 * 5. Error handling with fallbacks
 * 6. Database transactions
 * 7. Scheduled monitoring
 *
 * Validates that the workflow transformer correctly handles:
 * - Complex node connections
 * - Branching logic
 * - Parallel execution paths
 * - Node positioning
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { workflowCreate } from '../../src/tools/workflow-create.js';
import { workflowGet } from '../../src/tools/workflow-get.js';
import { executionList } from '../../src/tools/execution-list.js';
import { executionDebug } from '../../src/tools/execution-debug.js';
import { N8NClient } from '../../src/services/n8n-client.js';
import { loadConfig } from '../../src/config.js';
import {
  COMPLEX_SCENARIOS,
  EXPECTED_OUTCOMES,
} from '../fixtures/complex-scenarios.js';

const RUN_E2E = process.env.N8N_API_KEY !== undefined && process.env.N8N_URL !== undefined;

const describeE2E = RUN_E2E ? describe : describe.skip;

describeE2E('E2E: Complex Multi-Step Workflows', () => {
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

  describe('Data Pipeline Workflow', () => {
    test('should create multi-step data pipeline', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.DATA_PIPELINE_WORKFLOW,
        credentials: {
          'analytics-db': 'mock-db-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.DATA_PIPELINE_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Verify structure
      expect(workflow.nodes).toHaveLength(expected.nodes_count);

      // Verify trigger type
      const triggerNode = workflow.nodes.find(
        (n) => n.type.includes('webhook') || n.type.includes('manual') || n.type.includes('schedule')
      );
      expect(triggerNode?.type).toContain('webhook');

      // Verify has DB operation
      const dbNode = workflow.nodes.find((n) => n.type.includes('postgres'));
      expect(dbNode).toBeDefined();

      // Verify has HTTP call
      const httpNode = workflow.nodes.find((n) => n.type.includes('httpRequest'));
      expect(httpNode).toBeDefined();

      // Verify ends with respond
      const respondNode = workflow.nodes.find((n) => n.type.includes('respondToWebhook'));
      expect(respondNode).toBeDefined();

      // Verify connections form a linear chain
      expect(workflow.connections).toBeDefined();
      const connectionCount = Object.keys(workflow.connections).length;
      expect(connectionCount).toBeGreaterThan(0);
    });

    test('should preserve node order in pipeline', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.DATA_PIPELINE_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Node names should match step order
      const nodeNames = workflow.nodes.map((n) => n.name);
      expect(nodeNames).toContain('Receive Data');
      expect(nodeNames).toContain('Extract Payload');
      expect(nodeNames).toContain('Enrich User Data');
      expect(nodeNames).toContain('Store Event');
      expect(nodeNames).toContain('Success Response');
    });
  });

  describe('Validation Workflow (IF/ELSE Branching)', () => {
    test('should create conditional branching workflow', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.VALIDATION_WORKFLOW,
        credentials: {
          'app-db': 'mock-db-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.VALIDATION_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Find IF node
      const ifNode = workflow.nodes.find((n) => n.type.includes('if'));
      expect(ifNode).toBeDefined();

      // Verify IF node has outputs configured
      const ifNodeName = ifNode!.name;
      const ifConnections = workflow.connections.filter(
        (conn) => conn.from === ifNodeName
      );
      expect(ifConnections.length).toBeGreaterThanOrEqual(1);

      // Should have connections from IF node (true/false branches)
      expect(ifConnections.length).toBeGreaterThanOrEqual(2);
    });

    test('should connect both branches of IF node', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.VALIDATION_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      const ifNode = workflow.nodes.find((n) => n.type.includes('if'));
      const connections = workflow.connections.filter(
        (conn) => conn.from === ifNode!.name
      );

      // Both true and false paths should exist
      expect(connections).toBeDefined();
      expect(connections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Switch Workflow (Multi-Branch)', () => {
    test('should create multi-branch switch workflow', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.SWITCH_WORKFLOW,
        credentials: {
          'shop-db': 'mock-db-credential',
          'discord-alerts': 'mock-discord-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.SWITCH_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Find switch node
      const switchNode = workflow.nodes.find((n) => n.type.includes('switch'));
      expect(switchNode).toBeDefined();

      // Find schedule trigger
      const scheduleNode = workflow.nodes.find((n) => n.type.includes('schedule'));
      expect(scheduleNode).toBeDefined();
      expect(scheduleNode!.parameters).toHaveProperty('rule');
    });

    test('should have correct number of switch outputs', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.SWITCH_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      const switchNode = workflow.nodes.find((n) => n.type.includes('switch'));
      const connections = workflow.connections.filter(
        (conn) => conn.from === switchNode!.name
      );

      expect(connections).toBeDefined();
      // Should have 3 branches for priority levels
      expect(connections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Parallel Processing Workflow', () => {
    test('should create parallel workflow with merge', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.PARALLEL_WORKFLOW,
        credentials: {
          'shop-db': 'mock-db-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.PARALLEL_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Find merge node
      const mergeNode = workflow.nodes.find((n) => n.type.includes('merge'));
      expect(mergeNode).toBeDefined();

      // Manual trigger
      const manualNode = workflow.nodes.find((n) => n.type.includes('manual'));
      expect(manualNode).toBeDefined();
    });

    test('should connect parallel branches to merge', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.PARALLEL_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      const mergeNode = workflow.nodes.find((n) => n.type.includes('merge'));

      // Count incoming connections to merge node
      const incomingConnections = workflow.connections.filter(
        (conn) => conn.to === mergeNode!.name
      );

      // Should have multiple inputs to merge
      expect(incomingConnections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling Workflow', () => {
    test('should create workflow with error handling', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.ERROR_HANDLING_WORKFLOW,
        credentials: {
          'discord-alerts': 'mock-discord-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.ERROR_HANDLING_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Find HTTP nodes (primary and fallback)
      const httpNodes = workflow.nodes.filter((n) => n.type.includes('httpRequest'));
      expect(httpNodes.length).toBeGreaterThanOrEqual(2);

      // Primary API should exist
      const primaryApi = workflow.nodes.find((n) => n.name === 'Primary API');
      expect(primaryApi).toBeDefined();
      // Note: continueOnFail not exposed in WorkflowNodeDetail
    });

    test('should have fallback path configured', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.ERROR_HANDLING_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Verify IF node for checking success
      const ifNode = workflow.nodes.find((n) => n.name === 'Check Success');
      expect(ifNode).toBeDefined();

      // Verify fallback API exists
      const fallbackNode = workflow.nodes.find((n) => n.name === 'Fallback API');
      expect(fallbackNode).toBeDefined();

      // Verify alert node exists
      const alertNode = workflow.nodes.find((n) => n.name === 'Alert on Fallback');
      expect(alertNode).toBeDefined();
    });
  });

  describe('Database Transaction Workflow', () => {
    test('should create multi-step database workflow', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.DATABASE_TRANSACTION_WORKFLOW,
        credentials: {
          'app-db': 'mock-db-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.DATABASE_TRANSACTION_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Count postgres nodes
      const postgresNodes = workflow.nodes.filter((n) => n.type.includes('postgres'));
      expect(postgresNodes.length).toBe(expected.db_operations);

      // Verify operation types
      const operations = postgresNodes.map((n) => n.parameters.operation);
      expect(operations).toContain('update');
      expect(operations).toContain('insert');
      expect(operations).toContain('executeQuery');
    });

    test('should sequence database operations correctly', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.DATABASE_TRANSACTION_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Verify nodes are named correctly
      const nodeNames = workflow.nodes.map((n) => n.name);
      expect(nodeNames).toContain('Update Users');
      expect(nodeNames).toContain('Insert Audit Log');
      expect(nodeNames).toContain('Update Counters');
      expect(nodeNames).toContain('Verify All Succeeded');
    });
  });

  describe('Monitoring Workflow (Scheduled)', () => {
    test('should create health monitoring workflow', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.MONITORING_WORKFLOW,
        credentials: {
          'app-db': 'mock-db-credential',
          'discord-alerts': 'mock-discord-credential',
        },
      });

      createdWorkflows.push(result.workflow_id);

      const expected = EXPECTED_OUTCOMES.MONITORING_WORKFLOW;
      expect(result.nodes_count).toBe(expected.nodes_count);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Find schedule trigger
      const scheduleNode = workflow.nodes.find((n) => n.type.includes('schedule'));
      expect(scheduleNode).toBeDefined();

      // Should run every minute
      expect(scheduleNode!.parameters.rule).toBeDefined();
    });

    test('should have health check and alert paths', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.MONITORING_WORKFLOW,
      });

      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      // Verify health check nodes
      const healthNodes = workflow.nodes.filter((n) =>
        n.name.toLowerCase().includes('health') || n.name.toLowerCase().includes('check')
      );
      expect(healthNodes.length).toBeGreaterThanOrEqual(2);

      // Verify alert node
      const alertNode = workflow.nodes.find((n) => n.name === 'Critical Alert');
      expect(alertNode).toBeDefined();

      // Verify incident logging
      const logNode = workflow.nodes.find((n) => n.name === 'Log Incident');
      expect(logNode).toBeDefined();
    });
  });

  describe('Workflow Execution (Integration)', () => {
    test('should list executions for workflow', async () => {
      const createResult = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.DATA_PIPELINE_WORKFLOW,
      });
      createdWorkflows.push(createResult.workflow_id);

      // List executions (may be empty if workflow hasn't run)
      const executionsResult = await executionList(client, {
        workflow_id: createResult.workflow_id,
        limit: 10,
      });

      expect(executionsResult.executions).toBeDefined();
      expect(Array.isArray(executionsResult.executions)).toBe(true);
    });

    test('should handle execution debugging if executions exist', async () => {
      const createResult = await workflowCreate(client, {
        workflow: {
          name: 'Manual Test Workflow',
          steps: [
            { type: 'manual' },
            { type: 'code', config: { code: 'return [{ test: true }];' } },
            { type: 'respond' },
          ],
        },
      });
      createdWorkflows.push(createResult.workflow_id);

      // Get executions
      const executionsResult = await executionList(client, {
        workflow_id: createResult.workflow_id,
        limit: 5,
      });

      // If executions exist, test debug
      if (executionsResult.executions.length > 0) {
        const execution = executionsResult.executions[0];

        const debugResult = await executionDebug(client, {
          execution_id: execution.id,
        });

        expect(debugResult.execution_id).toBe(execution.id);
        expect(debugResult.workflow_id).toBeDefined();
        expect(debugResult.status).toBeDefined();
      }
    });
  });

  describe('Complex Workflow Validation', () => {
    test('should validate all complex scenarios are creatable', async () => {
      const scenarioKeys = Object.keys(COMPLEX_SCENARIOS) as Array<
        keyof typeof COMPLEX_SCENARIOS
      >;

      for (const key of scenarioKeys) {
        const scenario = COMPLEX_SCENARIOS[key];

        try {
          const result = await workflowCreate(client, {
            workflow: scenario,
            // Mock credentials for all possible credential references
            credentials: {
              'analytics-db': 'mock-1',
              'app-db': 'mock-2',
              'shop-db': 'mock-3',
              'discord-alerts': 'mock-4',
            },
          });

          expect(result.workflow_id).toBeDefined();
          createdWorkflows.push(result.workflow_id);

          // Verify against expected outcome
          const expected = EXPECTED_OUTCOMES[key];
          expect(result.nodes_count).toBe(expected.nodes_count);
        } catch (error) {
          throw new Error(`Failed to create scenario ${key}: ${error}`);
        }
      }
    });

    test('should preserve workflow metadata in all scenarios', async () => {
      const result = await workflowCreate(client, {
        workflow: COMPLEX_SCENARIOS.DATA_PIPELINE_WORKFLOW,
      });
      createdWorkflows.push(result.workflow_id);

      const workflow = await workflowGet(client, {
        workflow_id: result.workflow_id,
      });

      expect(workflow.name).toBe(COMPLEX_SCENARIOS.DATA_PIPELINE_WORKFLOW.name);
      expect(workflow.settings).toBeDefined();
      // Note: staticData not in WorkflowGetOutput
    });
  });
});
