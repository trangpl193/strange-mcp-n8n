import { describe, test, expect, beforeEach } from '@jest/globals';
import { WorkflowTransformer } from '../../../src/services/workflow-transformer.js';
import { McpError, McpErrorCode } from '@strange/mcp-core';
import {
  SIMPLE_WEBHOOK_WORKFLOW,
  POSTGRES_WORKFLOW,
  COMPLEX_BRANCHING_WORKFLOW,
  ALL_NODE_TYPES_WORKFLOW,
} from '../../fixtures/workflows.js';

describe('WorkflowTransformer', () => {
  let transformer: WorkflowTransformer;

  beforeEach(() => {
    transformer = new WorkflowTransformer();
  });

  describe('transform()', () => {
    test('should transform simple webhook workflow', () => {
      const result = transformer.transform(SIMPLE_WEBHOOK_WORKFLOW);

      expect(result.name).toBe('Simple Webhook Test');
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes![0].type).toBe('n8n-nodes-base.webhook');
      expect(result.nodes![1].type).toBe('n8n-nodes-base.respondToWebhook');
    });

    test('should auto-generate node names when not provided', () => {
      const result = transformer.transform(SIMPLE_WEBHOOK_WORKFLOW);

      expect(result.nodes![0].name).toBe('Webhook');
      expect(result.nodes![1].name).toBe('Respond 2');
    });

    test('should use custom node names when provided', () => {
      const result = transformer.transform(COMPLEX_BRANCHING_WORKFLOW);

      const startNode = result.nodes!.find(n => n.name === 'Start');
      const checkNode = result.nodes!.find(n => n.name === 'Check');

      expect(startNode).toBeDefined();
      expect(checkNode).toBeDefined();
    });

    test('should auto-connect sequential steps', () => {
      const result = transformer.transform(SIMPLE_WEBHOOK_WORKFLOW);

      expect(result.connections).toBeDefined();

      const webhookConnections = result.connections!['Webhook'];
      expect(webhookConnections).toBeDefined();
      expect(webhookConnections.main).toBeDefined();
      expect(webhookConnections.main![0]).toHaveLength(1);
      expect(webhookConnections.main![0][0].node).toBe('Respond 2');
    });

    test('should handle explicit next connections', () => {
      const result = transformer.transform(COMPLEX_BRANCHING_WORKFLOW);

      const checkNode = result.nodes!.find(n => n.name === 'Check');
      expect(checkNode).toBeDefined();

      const checkConnections = result.connections!['Check'];
      // IF node creates multiple output ports (one per branch)
      expect(checkConnections.main).toHaveLength(2);
      // First output port (true/output 0) -> Success
      expect(checkConnections.main![0]).toHaveLength(1);
      expect(checkConnections.main![0][0].node).toBe('Success');
      // Second output port (false/output 1) -> Error
      expect(checkConnections.main![1]).toHaveLength(1);
      expect(checkConnections.main![1][0].node).toBe('Error');
    });

    test('should resolve credentials with credential map', () => {
      const transformerWithCreds = new WorkflowTransformer(
        new Map([['test-db', 'cred-12345']])
      );

      const result = transformerWithCreds.transform(POSTGRES_WORKFLOW);

      const postgresNode = result.nodes!.find(n => n.type === 'n8n-nodes-base.postgres');
      expect(postgresNode).toBeDefined();
      expect(postgresNode!.credentials).toEqual({
        postgresApi: {
          id: 'cred-12345',
          name: 'test-db',
        },
      });
    });

    test('should auto-generate mock credentials in test mode', () => {
      // In test mode, transformer auto-generates mock credentials
      const result = transformer.transform(POSTGRES_WORKFLOW);

      const postgresNode = result.nodes!.find(n => n.type === 'n8n-nodes-base.postgres');
      expect(postgresNode).toBeDefined();
      expect(postgresNode!.credentials).toBeDefined();
      expect(postgresNode!.credentials!.postgresApi).toEqual({
        id: 'mock-credential-test-db',
        name: 'test-db',
      });
    });

    test('should throw McpError on unknown node type', () => {
      const invalidWorkflow = {
        name: 'Invalid Workflow',
        steps: [{ type: 'unknown_type' }],
      };

      expect(() => {
        transformer.transform(invalidWorkflow);
      }).toThrow(McpError);

      try {
        transformer.transform(invalidWorkflow);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(McpErrorCode.INVALID_PARAMS);
        expect((error as McpError).message).toContain('unknown_type');
      }
    });

    test('should assign correct typeVersion per node type', () => {
      const credMap = new Map([
        ['db', 'cred-1'],
        ['discord', 'cred-2'],
      ]);
      const transformerWithCreds = new WorkflowTransformer(credMap);

      const result = transformerWithCreds.transform(ALL_NODE_TYPES_WORKFLOW);

      expect(result.nodes).toHaveLength(10);

      // Check specific type versions
      const webhookNode = result.nodes!.find(n => n.type === 'n8n-nodes-base.webhook');
      expect(webhookNode?.typeVersion).toBe(2);

      const httpNode = result.nodes!.find(n => n.type === 'n8n-nodes-base.httpRequest');
      expect(httpNode?.typeVersion).toBe(4);

      const postgresNode = result.nodes!.find(n => n.type === 'n8n-nodes-base.postgres');
      expect(postgresNode?.typeVersion).toBe(2);
    });

    test('should merge default params with config', () => {
      const result = transformer.transform(SIMPLE_WEBHOOK_WORKFLOW);

      const webhookNode = result.nodes!.find(n => n.type === 'n8n-nodes-base.webhook');
      expect(webhookNode?.parameters).toMatchObject({
        path: '/test',
        httpMethod: 'POST',
        responseMode: 'onReceived',
      });
    });

    test('should auto-position nodes horizontally', () => {
      const result = transformer.transform(SIMPLE_WEBHOOK_WORKFLOW);

      expect(result.nodes![0].position).toEqual([250, 300]);
      expect(result.nodes![1].position).toEqual([450, 300]);
    });

    test('should generate unique UUIDs for node IDs', () => {
      const result = transformer.transform(SIMPLE_WEBHOOK_WORKFLOW);

      const ids = result.nodes!.map(n => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    test('should handle all 10 supported node types', () => {
      const credMap = new Map([
        ['db', 'cred-1'],
        ['discord', 'cred-2'],
      ]);
      const transformerWithCreds = new WorkflowTransformer(credMap);

      const result = transformerWithCreds.transform(ALL_NODE_TYPES_WORKFLOW);

      expect(result.nodes).toHaveLength(10);

      const nodeTypes = result.nodes!.map(n => n.type);
      expect(nodeTypes).toContain('n8n-nodes-base.webhook');
      expect(nodeTypes).toContain('n8n-nodes-base.httpRequest');
      expect(nodeTypes).toContain('n8n-nodes-base.postgres');
      expect(nodeTypes).toContain('n8n-nodes-base.discord');
      expect(nodeTypes).toContain('n8n-nodes-base.if');
      expect(nodeTypes).toContain('n8n-nodes-base.switch');
      expect(nodeTypes).toContain('n8n-nodes-base.merge');
      expect(nodeTypes).toContain('n8n-nodes-base.set');
      expect(nodeTypes).toContain('n8n-nodes-base.code');
      expect(nodeTypes).toContain('n8n-nodes-base.respondToWebhook');
    });

    test('should preserve custom config parameters', () => {
      const customWorkflow = {
        name: 'Custom Config Test',
        steps: [
          {
            type: 'http',
            config: {
              url: 'https://api.example.com/data',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            },
          },
        ],
      };

      const result = transformer.transform(customWorkflow);
      const httpNode = result.nodes![0];

      expect(httpNode.parameters).toMatchObject({
        url: 'https://api.example.com/data',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('getCredentialType()', () => {
    test('should map postgres to postgresApi', () => {
      const credType = (transformer as any).getCredentialType('n8n-nodes-base.postgres');
      expect(credType).toBe('postgresApi');
    });

    test('should map discord to discordApi', () => {
      const credType = (transformer as any).getCredentialType('n8n-nodes-base.discord');
      expect(credType).toBe('discordApi');
    });

    test('should map http to httpBasicAuth', () => {
      const credType = (transformer as any).getCredentialType('n8n-nodes-base.httpRequest');
      expect(credType).toBe('httpBasicAuth');
    });

    test('should default to generic pattern for unmapped types', () => {
      const credType = (transformer as any).getCredentialType('n8n-nodes-base.customService');
      expect(credType).toBe('default');
    });
  });
});
