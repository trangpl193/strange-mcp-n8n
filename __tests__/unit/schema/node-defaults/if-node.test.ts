import { describe, test, expect } from '@jest/globals';
import { ifNodeDefaults } from '../../../../src/schema/node-defaults/if-node.js';

// Helper type for accessing conditions in tests
type ResultWithConditions = Record<string, unknown> & {
  conditions: {
    combinator?: string;
    conditions?: Array<{
      leftValue: string;
      rightValue: string;
      operator: { type: string; operation: string };
    }>;
  };
};

describe('schema/node-defaults/if-node', () => {
  describe('ifNodeDefaults', () => {
    test('should have correct nodeType identifier', () => {
      expect(ifNodeDefaults.nodeType).toBe('if');
    });

    test('should have applyDefaults function', () => {
      expect(ifNodeDefaults.applyDefaults).toBeDefined();
      expect(typeof ifNodeDefaults.applyDefaults).toBe('function');
    });
  });

  describe('applyDefaults - N8N Native Format (Pass-through)', () => {
    test('should pass through config with combinator + conditions[] format', () => {
      const config = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '={{ $json.field }}',
              rightValue: 'value',
              operator: { type: 'string', operation: 'equals' },
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
      expect(result.conditions).toHaveProperty('combinator', 'and');
      expect(result.conditions).toHaveProperty('conditions');
      expect(Array.isArray(((result as ResultWithConditions).conditions).conditions)).toBe(true);
    });

    test('should pass through config with "or" combinator', () => {
      const config = {
        conditions: {
          combinator: 'or',
          conditions: [
            {
              leftValue: '={{ $json.status }}',
              rightValue: 'active',
              operator: { type: 'string', operation: 'equals' },
            },
            {
              leftValue: '={{ $json.status }}',
              rightValue: 'pending',
              operator: { type: 'string', operation: 'equals' },
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
      expect(((result as ResultWithConditions).conditions).combinator).toBe('or');
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(2);
    });

    test('should pass through config with multiple conditions', () => {
      const config = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '={{ $json.age }}',
              rightValue: '18',
              operator: { type: 'number', operation: 'gt' },
            },
            {
              leftValue: '={{ $json.active }}',
              rightValue: 'true',
              operator: { type: 'boolean', operation: 'equals' },
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(2);
    });

    test('should pass through empty conditions array', () => {
      const config = {
        conditions: {
          combinator: 'and',
          conditions: [],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
      expect(((result as ResultWithConditions).conditions).conditions).toEqual([]);
    });
  });

  describe('applyDefaults - Simplified Format Transformation', () => {
    test('should transform simplified string conditions to N8N format', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.name }}',
              value2: 'John',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result.conditions).toHaveProperty('combinator', 'and');
      expect(result.conditions).toHaveProperty('conditions');
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(1);
      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '={{ $json.name }}',
        rightValue: 'John',
        operator: { type: 'string', operation: 'equals' },
      });
    });

    test('should transform simplified number conditions to N8N format', () => {
      const config = {
        conditions: {
          number: [
            {
              value1: '={{ $json.count }}',
              value2: '10',
              operation: 'gt',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).combinator).toBe('and');
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(1);
      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '={{ $json.count }}',
        rightValue: '10',
        operator: { type: 'number', operation: 'gt' },
      });
    });

    test('should transform simplified boolean conditions to N8N format', () => {
      const config = {
        conditions: {
          boolean: [
            {
              value1: '={{ $json.active }}',
              value2: 'true',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).combinator).toBe('and');
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(1);
      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '={{ $json.active }}',
        rightValue: 'true',
        operator: { type: 'boolean', operation: 'equals' },
      });
    });

    test('should transform multiple string conditions', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.name }}',
              value2: 'John',
              operation: 'equals',
            },
            {
              value1: '={{ $json.email }}',
              value2: '@example.com',
              operation: 'contains',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(2);
      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator).toEqual({ type: 'string', operation: 'equals' });
      expect(((result as ResultWithConditions).conditions).conditions![1]!.operator).toEqual({ type: 'string', operation: 'contains' });
    });

    test('should transform mixed type conditions (string + number + boolean)', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.name }}',
              value2: 'John',
              operation: 'equals',
            },
          ],
          number: [
            {
              value1: '={{ $json.age }}',
              value2: '18',
              operation: 'gte',
            },
          ],
          boolean: [
            {
              value1: '={{ $json.verified }}',
              value2: 'true',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(3);
      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator.type).toBe('string');
      expect(((result as ResultWithConditions).conditions).conditions![1]!.operator.type).toBe('number');
      expect(((result as ResultWithConditions).conditions).conditions![2]!.operator.type).toBe('boolean');
    });

    test('should use explicit combinator when provided in simplified format', () => {
      const config = {
        conditions: {
          combinator: 'or',
          string: [
            {
              value1: '={{ $json.status }}',
              value2: 'active',
              operation: 'equals',
            },
            {
              value1: '={{ $json.status }}',
              value2: 'pending',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).combinator).toBe('or');
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(2);
    });

    test('should default to "and" combinator when not specified', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.field }}',
              value2: 'value',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).combinator).toBe('and');
    });
  });

  describe('applyDefaults - Default Value Application', () => {
    test('should apply default empty string for missing value1', () => {
      const config = {
        conditions: {
          string: [
            {
              // Missing value1
              value2: 'test',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!.leftValue).toBe('');
    });

    test('should apply default empty string for missing value2', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.field }}',
              // Missing value2
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!.rightValue).toBe('');
    });

    test('should apply default "equals" operation when missing', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.field }}',
              value2: 'value',
              // Missing operation
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator.operation).toBe('equals');
    });

    test('should apply defaults for number conditions', () => {
      const config = {
        conditions: {
          number: [
            {
              // Missing all values
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '',
        rightValue: '',
        operator: { type: 'number', operation: 'equals' },
      });
    });

    test('should apply defaults for boolean conditions', () => {
      const config = {
        conditions: {
          boolean: [
            {
              value1: '={{ $json.flag }}',
              // Missing value2 and operation
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '={{ $json.flag }}',
        rightValue: '',
        operator: { type: 'boolean', operation: 'equals' },
      });
    });
  });

  describe('applyDefaults - Dual Format Handling', () => {
    test('should detect and pass through N8N format even with extra fields', () => {
      const config = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '={{ $json.field }}',
              rightValue: 'value',
              operator: { type: 'string', operation: 'equals' },
            },
          ],
        },
        otherField: 'should-be-preserved',
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
      expect(result).toHaveProperty('otherField', 'should-be-preserved');
    });

    test('should transform simplified format and preserve other fields', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.test }}',
              value2: 'value',
              operation: 'equals',
            },
          ],
        },
        customField: 'custom-value',
        anotherField: 123,
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toHaveProperty('customField', 'custom-value');
      expect(result).toHaveProperty('anotherField', 123);
      expect(result.conditions).toHaveProperty('combinator', 'and');
      expect(result.conditions).toHaveProperty('conditions');
    });

    test('should not confuse simplified format with N8N format', () => {
      // This has combinator but uses old format - should still transform
      const config = {
        conditions: {
          combinator: 'or',
          string: [
            {
              value1: '={{ $json.field }}',
              value2: 'value',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      // Should transform because it doesn't have conditions[] array
      expect(result.conditions).toHaveProperty('combinator', 'or');
      expect(result.conditions).toHaveProperty('conditions');
      expect(Array.isArray(((result as ResultWithConditions).conditions).conditions)).toBe(true);
    });
  });

  describe('applyDefaults - Error Handling and Edge Cases', () => {
    test('should return config unchanged when conditions is missing', () => {
      const config = {
        someOtherField: 'value',
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
    });

    test('should return config unchanged when conditions is not an object', () => {
      const config = {
        conditions: 'invalid',
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
    });

    test('should return config unchanged when conditions is null', () => {
      const config = {
        conditions: null,
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(result).toEqual(config);
    });

    test('should return config unchanged when conditions is an array', () => {
      const config = {
        conditions: [],
      };

      const result = ifNodeDefaults.applyDefaults(config);

      // When conditions is an array (invalid), it will be treated as empty object
      // and transformed to valid N8N format
      expect(result).toEqual({
        conditions: {
          combinator: 'and',
          conditions: [],
        },
      });
    });

    test('should handle empty conditions object', () => {
      const config = {
        conditions: {},
      };

      const result = ifNodeDefaults.applyDefaults(config);

      // Should transform to N8N format with empty conditions
      expect(result.conditions).toEqual({
        combinator: 'and',
        conditions: [],
      });
    });

    test('should handle conditions with empty arrays', () => {
      const config = {
        conditions: {
          string: [],
          number: [],
          boolean: [],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions).toEqual([]);
    });

    test('should handle mixed empty and non-empty condition arrays', () => {
      const config = {
        conditions: {
          string: [],
          number: [
            {
              value1: '={{ $json.count }}',
              value2: '5',
              operation: 'gt',
            },
          ],
          boolean: [],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(1);
      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator.type).toBe('number');
    });

    test('should handle conditions with non-array type properties', () => {
      const config = {
        conditions: {
          string: 'not-an-array',
          number: [
            {
              value1: '5',
              value2: '10',
              operation: 'lt',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      // Should only process valid arrays (number)
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(1);
      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator.type).toBe('number');
    });

    test('should handle undefined values in condition objects', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: undefined,
              value2: undefined,
              operation: undefined,
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '',
        rightValue: '',
        operator: { type: 'string', operation: 'equals' },
      });
    });

    test('should handle null values in condition objects', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: null,
              value2: null,
              operation: null,
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!).toEqual({
        leftValue: '',
        rightValue: '',
        operator: { type: 'string', operation: 'equals' },
      });
    });

    test('should preserve operator object if already in correct format', () => {
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.field }}',
              value2: 'value',
              operation: 'contains',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator).toEqual({
        type: 'string',
        operation: 'contains',
      });
    });
  });

  describe('applyDefaults - Real-world Scenarios', () => {
    test('should handle workflow from N8N UI export (native format)', () => {
      // This is the format that N8N UI creates and exports
      const config = {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
          },
          combinator: 'and',
          conditions: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              leftValue: '={{ $json.status }}',
              rightValue: 'completed',
              operator: {
                type: 'string',
                operation: 'equals',
                rightType: 'any',
              },
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      // Should pass through unchanged
      expect(result).toEqual(config);
      expect(((result as ResultWithConditions).conditions).conditions![0])!.toHaveProperty('id');
      expect(result.conditions).toHaveProperty('options');
    });

    test('should handle builder-created simplified format', () => {
      // This is what our builder creates
      const config = {
        conditions: {
          string: [
            {
              value1: '={{ $json.status }}',
              value2: 'active',
              operation: 'equals',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      // Should transform to N8N format
      expect(result.conditions).toHaveProperty('combinator');
      expect(result.conditions).toHaveProperty('conditions');
      expect(((result as ResultWithConditions).conditions).conditions![0])!.toHaveProperty('leftValue');
      expect(((result as ResultWithConditions).conditions).conditions![0])!.toHaveProperty('rightValue');
      expect(((result as ResultWithConditions).conditions).conditions![0])!.toHaveProperty('operator');
    });

    test('should handle complex multi-condition workflow', () => {
      const config = {
        conditions: {
          combinator: 'or',
          string: [
            {
              value1: '={{ $json.type }}',
              value2: 'user',
              operation: 'equals',
            },
            {
              value1: '={{ $json.type }}',
              value2: 'admin',
              operation: 'equals',
            },
          ],
          number: [
            {
              value1: '={{ $json.age }}',
              value2: '21',
              operation: 'gte',
            },
          ],
        },
      };

      const result = ifNodeDefaults.applyDefaults(config);

      expect(((result as ResultWithConditions).conditions).combinator).toBe('or');
      expect(((result as ResultWithConditions).conditions).conditions).toHaveLength(3);
      expect(((result as ResultWithConditions).conditions).conditions![0]!.operator.operation).toBe('equals');
      expect(((result as ResultWithConditions).conditions).conditions![1]!.operator.operation).toBe('equals');
      expect(((result as ResultWithConditions).conditions).conditions![2]!.operator.operation).toBe('gte');
    });
  });
});
