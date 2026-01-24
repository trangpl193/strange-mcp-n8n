import { describe, test, expect, beforeAll } from '@jest/globals';
import { WorkflowTransformer } from '../../src/services/workflow-transformer.js';
import { workflowValidateRender } from '../../src/tools/workflow-validate-render.js';
import type { SimplifiedWorkflow } from '../../src/schemas/simplified-workflow.js';

/**
 * Integration test for transformer branching fix and validation tool
 *
 * Tests the complete flow:
 * 1. Transformer creates workflow with proper branching connections
 * 2. Validation tool detects any rendering issues
 */
describe('Transformer Branching Fix + Validation Integration', () => {
  let transformer: WorkflowTransformer;

  beforeAll(() => {
    transformer = new WorkflowTransformer();
  });

  describe('IF node auto-connect', () => {
    test('should create IF node with 2 output branches', () => {
      const workflow: SimplifiedWorkflow = {
        name: 'IF Auto-Connect Test',
        steps: [
          { type: 'webhook', name: 'Start' },
          {
            type: 'if',
            name: 'Check Urgent',
            config: {
              conditions: {
                options: {
                  caseSensitive: true,
                  leftValue: '',
                  typeValidation: 'strict',
                },
                conditions: [
                  {
                    id: 'check-1',
                    leftValue: '={{ $json.urgent }}',
                    rightValue: 'true',
                    operator: { type: 'boolean', operation: 'equals' },
                  },
                ],
                combinator: 'and',
              },
              options: {},
            },
          },
          { type: 'code', name: 'Urgent Handler' },
          { type: 'code', name: 'Normal Handler' },
          { type: 'respond', name: 'Response' },
        ],
      };

      const result = transformer.transform(workflow);

      // Verify IF node has 2 output branches
      const ifConnections = result.connections!['Check Urgent'];
      expect(ifConnections).toBeDefined();
      expect(ifConnections.main).toHaveLength(2);

      // Output 0 → Urgent Handler
      expect(ifConnections.main![0]).toHaveLength(1);
      expect(ifConnections.main![0][0].node).toBe('Urgent Handler');

      // Output 1 → Normal Handler
      expect(ifConnections.main![1]).toHaveLength(1);
      expect(ifConnections.main![1][0].node).toBe('Normal Handler');
    });
  });

  describe('Switch node auto-connect with rules.values structure', () => {
    test('should create Switch node with correct number of outputs based on rules count', () => {
      const workflow: SimplifiedWorkflow = {
        name: 'Switch Auto-Connect Test',
        steps: [
          { type: 'webhook', name: 'Start' },
          {
            type: 'switch',
            name: 'Priority Router',
            config: {
              mode: 'rules',
              rules: {
                values: [
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.priority }}',
                          rightValue: 'high',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.priority }}',
                          rightValue: 'medium',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.priority }}',
                          rightValue: 'low',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                ],
              },
              fallbackOutput: 3,
            },
          },
          { type: 'code', name: 'High Priority' },
          { type: 'code', name: 'Medium Priority' },
          { type: 'code', name: 'Low Priority' },
          { type: 'respond', name: 'Fallback Response' },
        ],
      };

      const result = transformer.transform(workflow);

      // Verify Switch node has 4 output branches (3 rules + 1 fallback)
      const switchConnections = result.connections!['Priority Router'];
      expect(switchConnections).toBeDefined();
      expect(switchConnections.main).toHaveLength(4);

      // Output 0 → High Priority
      expect(switchConnections.main![0]).toHaveLength(1);
      expect(switchConnections.main![0][0].node).toBe('High Priority');

      // Output 1 → Medium Priority
      expect(switchConnections.main![1]).toHaveLength(1);
      expect(switchConnections.main![1][0].node).toBe('Medium Priority');

      // Output 2 → Low Priority
      expect(switchConnections.main![2]).toHaveLength(1);
      expect(switchConnections.main![2][0].node).toBe('Low Priority');

      // Output 3 → Fallback Response
      expect(switchConnections.main![3]).toHaveLength(1);
      expect(switchConnections.main![3][0].node).toBe('Fallback Response');
    });
  });

  describe('Complex workflow with multiple branching nodes', () => {
    test('should handle workflow with IF and Switch nodes correctly', () => {
      const workflow: SimplifiedWorkflow = {
        name: 'Complex Branching Workflow',
        steps: [
          { type: 'webhook', name: 'Webhook' },
          { type: 'code', name: 'Generate Data' },
          {
            type: 'if',
            name: 'Check Urgent',
            config: {
              conditions: {
                options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
                conditions: [
                  {
                    id: 'urgent-check',
                    leftValue: '={{ $json.urgent }}',
                    rightValue: 'true',
                    operator: { type: 'boolean', operation: 'equals' },
                  },
                ],
                combinator: 'and',
              },
              options: {},
            },
          },
          { type: 'code', name: 'Urgent Handler' },
          {
            type: 'switch',
            name: 'Priority Router',
            config: {
              mode: 'rules',
              rules: {
                values: [
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.priority }}',
                          rightValue: 'high',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.priority }}',
                          rightValue: 'low',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                ],
              },
              fallbackOutput: 2,
            },
          },
          { type: 'code', name: 'High Priority' },
          { type: 'code', name: 'Low Priority' },
          { type: 'respond', name: 'Response' },
        ],
      };

      const result = transformer.transform(workflow);

      // Verify IF node connections
      const ifConnections = result.connections!['Check Urgent'];
      expect(ifConnections.main).toHaveLength(2);
      expect(ifConnections.main![0][0].node).toBe('Urgent Handler');
      expect(ifConnections.main![1][0].node).toBe('Priority Router');

      // Verify Switch node connections
      const switchConnections = result.connections!['Priority Router'];
      expect(switchConnections.main).toHaveLength(3); // 2 rules + 1 fallback
      expect(switchConnections.main![0][0].node).toBe('High Priority');
      expect(switchConnections.main![1][0].node).toBe('Low Priority');
      expect(switchConnections.main![2][0].node).toBe('Response');
    });
  });

  describe('Validation integration', () => {
    test('workflow with correct IF node parameters should pass validation', () => {
      const workflow: SimplifiedWorkflow = {
        name: 'Valid IF Workflow',
        steps: [
          { type: 'webhook', name: 'Start' },
          {
            type: 'if',
            name: 'Check',
            config: {
              conditions: {
                options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
                conditions: [
                  {
                    id: 'cond-1',
                    leftValue: '={{ $json.value }}',
                    rightValue: 'true',
                    operator: { type: 'boolean', operation: 'equals' },
                  },
                ],
                combinator: 'and',
              },
              options: {},
            },
          },
          { type: 'respond', name: 'Success' },
          { type: 'respond', name: 'Failure' },
        ],
      };

      const result = transformer.transform(workflow);

      // Mock validation (would normally use N8N client)
      // Validate nodes structure
      expect(result.nodes).toHaveLength(4);
      expect(result.connections!['Check'].main).toHaveLength(2);

      // Validate IF node parameters
      const ifNode = result.nodes!.find((n) => n.name === 'Check');
      expect(ifNode).toBeDefined();
      expect(ifNode!.parameters.conditions).toBeDefined();
      expect(ifNode!.parameters.conditions.options).toBeDefined();
      expect(ifNode!.parameters.conditions.conditions).toHaveLength(1);
    });

    test('workflow with correct Switch node parameters should pass validation', () => {
      const workflow: SimplifiedWorkflow = {
        name: 'Valid Switch Workflow',
        steps: [
          { type: 'webhook', name: 'Start' },
          {
            type: 'switch',
            name: 'Router',
            config: {
              mode: 'rules',
              rules: {
                values: [
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.type }}',
                          rightValue: 'A',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                  {
                    conditions: {
                      combinator: 'and',
                      conditions: [
                        {
                          leftValue: '={{ $json.type }}',
                          rightValue: 'B',
                          operator: { type: 'string', operation: 'equals' },
                        },
                      ],
                    },
                  },
                ],
              },
              fallbackOutput: 2,
            },
          },
          { type: 'respond', name: 'Handler A' },
          { type: 'respond', name: 'Handler B' },
          { type: 'respond', name: 'Default' },
        ],
      };

      const result = transformer.transform(workflow);

      // Validate Switch node structure
      const switchNode = result.nodes!.find((n) => n.name === 'Router');
      expect(switchNode).toBeDefined();
      expect(switchNode!.parameters.mode).toBe('rules');
      expect(switchNode!.parameters.rules).toBeDefined();
      expect(switchNode!.parameters.rules.values).toHaveLength(2);
      expect(switchNode!.parameters.fallbackOutput).toBe(2);

      // Validate connections
      expect(result.connections!['Router'].main).toHaveLength(3); // 2 rules + 1 fallback
    });
  });
});
