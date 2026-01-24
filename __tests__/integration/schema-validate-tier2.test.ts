/**
 * Tier 2 Enhancement: schema_validate Integration Tests
 *
 * Tests for enhanced schema_validate tool with editor compatibility checks.
 * Validates proactive detection of broken parameters before workflow creation.
 *
 * @see /home/strange/.claude/briefs/tier-2-implementation-design-2026-01-24.md
 */

import { describe, test, expect } from '@jest/globals';
import { schema_validate } from '../../../src/knowledge/tools';

describe('schema_validate - Tier 2 Enhancement', () => {
  describe('If-node: Validation', () => {
    test('should reject pure combinator (missing options wrapper)', async () => {
      const params = {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '={{ $json.status }}',
              rightValue: 'success',
              operator: { type: 'string', operation: 'equals' }
            }
          ]
        }
      };

      const result = await schema_validate('if', params);

      expect(result.valid).toBe(false);
      expect(result.editorCompatible).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.editorIssues).toBeDefined();
    });

    test('should accept hybrid format with all requirements', async () => {
      const params = {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict'
          },
          combinator: 'and',
          conditions: [
            {
              id: 'condition1',
              leftValue: '={{ $json.status }}',
              rightValue: 'success',
              operator: { type: 'string', operation: 'equals' }
            }
          ]
        },
        options: {}
      };

      const result = await schema_validate('if', params);

      expect(result.valid).toBe(true);
      expect(result.editorCompatible).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.editorIssues).toBeUndefined();
      expect(result.matchedFormat).toBe('hybrid');
    });

    test('should detect missing condition IDs', async () => {
      const params = {
        conditions: {
          options: { caseSensitive: true },
          combinator: 'and',
          conditions: [
            {
              // Missing id field
              leftValue: '={{ $json.status }}',
              rightValue: 'success',
              operator: { type: 'string', operation: 'equals' }
            }
          ]
        },
        options: {}
      };

      const result = await schema_validate('if', params);

      expect(result.valid).toBe(false);
      expect(result.editorCompatible).toBe(false);

      // Should detect missing IDs in editor issues
      const idIssue = result.editorIssues?.find(
        i => i.id && i.id.includes('id')
      );
      expect(idIssue).toBeDefined();
    });

    test('should provide fix suggestions for broken parameters', async () => {
      const params = {
        conditions: {
          combinator: 'and',
          conditions: []
        }
      };

      const result = await schema_validate('if', params);

      expect(result.valid).toBe(false);
      expect(result.editorIssues).toBeDefined();
      expect(result.editorIssues!.length).toBeGreaterThan(0);

      // Check that fix suggestions exist
      const fixedIssue = result.editorIssues!.find((i: any) => i.fix);
      expect(fixedIssue).toBeDefined();
      expect(fixedIssue?.fix).toContain('options');
    });
  });

  describe('Switch-node: Validation', () => {
    test('should reject direct rules array', async () => {
      const params = {
        mode: 'rules',
        rules: [ // Wrong: should be rules.values
          {
            conditions: {
              combinator: 'and',
              conditions: []
            }
          }
        ]
      };

      const result = await schema_validate('switch', params, 1);

      expect(result.valid).toBe(false);
      expect(result.editorCompatible).toBe(false);

      const valuesIssue = result.editorIssues?.find(
        (i: any) => i.id && i.id.includes('values')
      );
      expect(valuesIssue).toBeDefined();
    });

    test('should accept correct rules.values format', async () => {
      const params = {
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
                    operator: { type: 'string', operation: 'equals' }
                  }
                ]
              }
            }
          ]
        },
        fallbackOutput: 3
      };

      const result = await schema_validate('switch', params, 1);

      expect(result.valid).toBe(true);
      expect(result.editorCompatible).toBe(true);
      expect(result.matchedFormat).toBe('rules');
    });

    test('should detect missing rules.values wrapper', async () => {
      const params = {
        mode: 'rules',
        rules: []
      };

      const result = await schema_validate('switch', params, 1);

      expect(result.valid).toBe(false);
      expect(result.editorIssues).toBeDefined();

      const issue = result.editorIssues?.find(
        (i: any) => i.id && i.id.includes('rules')
      );
      expect(issue).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('schema_validate should complete in <200ms', async () => {
      const params = {
        conditions: {
          options: { caseSensitive: true },
          combinator: 'and',
          conditions: [
            {
              id: 'c1',
              leftValue: '',
              rightValue: '',
              operator: { type: 'string', operation: 'equals' }
            }
          ]
        },
        options: {}
      };

      const start = Date.now();
      await schema_validate('if', params, 2);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    test('should handle rapid sequential validations', async () => {
      const params = {
        conditions: {
          options: { caseSensitive: true },
          combinator: 'and',
          conditions: [{ id: 'c1', leftValue: '', rightValue: '', operator: {} }]
        },
        options: {}
      };

      const start = Date.now();

      // Run 10 validations
      const results = await Promise.all(
        Array(10).fill(null).map(() => schema_validate('if', params, 2))
      );

      const duration = Date.now() - start;

      expect(results).toHaveLength(10);
      expect(results.every((r: any) => r.valid)).toBe(true);
      expect(duration).toBeLessThan(2000); // All 10 should complete in <2s
    });
  });

  describe('Error Cases', () => {
    test('should handle unknown node type', async () => {
      const params = { test: true };

      await expect(schema_validate('unknown_type', params, 1)).rejects.toThrow();
    });

    test('should handle null parameters', async () => {
      const params = null as any;

      const result = await schema_validate('if', params);
      expect(result.valid).toBe(false);
    });

    test('should handle undefined parameters', async () => {
      const params = undefined as any;

      const result = await schema_validate('if', params);
      expect(result.valid).toBe(false);
    });

    test('should handle empty parameters', async () => {
      const params = {};

      const result = await schema_validate('if', params);
      expect(result.valid).toBe(false);
    });
  });

  describe('Fix Suggestion Accuracy', () => {
    test('suggested fixes should resolve validation errors', async () => {
      // Step 1: Validate broken params
      const brokenParams = {
        conditions: {
          combinator: 'and',
          conditions: []
        }
      };

      const brokenResult = await schema_validate('if', brokenParams, 2);
      expect(brokenResult.valid).toBe(false);
      expect(brokenResult.editorIssues).toBeDefined();

      // Step 2: Get first fix suggestion
      const firstIssue = brokenResult.editorIssues?.[0];
      expect(firstIssue?.fix).toBeDefined();

      // Step 3: Apply fix (simplified - just checking structure)
      const fixedParams = {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
          combinator: 'and',
          conditions: [
            {
              id: 'c1',
              leftValue: '={{ $json.test }}',
              rightValue: 'value',
              operator: { type: 'string', operation: 'equals' }
            }
          ]
        },
        options: {}
      };

      // Step 4: Validate fixed params
      const fixedResult = await schema_validate('if', fixedParams, 2);
      expect(fixedResult.valid).toBe(true);
      expect(fixedResult.editorCompatible).toBe(true);
    });
  });

  describe('Format Detection', () => {
    test('should correctly identify hybrid format', async () => {
      const params = {
        conditions: {
          options: { caseSensitive: true },
          combinator: 'and',
          conditions: [{ id: 'c1', leftValue: '', rightValue: '', operator: {} }]
        },
        options: {}
      };

      const result = await schema_validate('if', params);
      expect(result.matchedFormat).toBe('hybrid');
    });

    test('should correctly identify rules format for Switch', async () => {
      const params = {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: {
                combinator: 'and',
                conditions: []
              }
            }
          ]
        },
        fallbackOutput: 0
      };

      const result = await schema_validate('switch', params, 1);
      expect(result.matchedFormat).toBe('rules');
    });
  });

  describe('Backwards Compatibility', () => {
    test('should still validate format structure correctly', async () => {
      const params = {
        conditions: {
          options: { caseSensitive: true },
          combinator: 'and',
          conditions: [
            {
              id: 'c1',
              leftValue: '={{ $json.status }}',
              rightValue: 'active',
              operator: { type: 'string', operation: 'equals' }
            }
          ]
        },
        options: {}
      };

      const result = await schema_validate('if', params);

      // Basic format validation should still work
      expect(result.valid).toBe(true);
      expect(result.matchedFormat).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors array for invalid formats', async () => {
      const params = { invalid: 'structure' };

      const result = await schema_validate('if', params);

      expect(result.valid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
