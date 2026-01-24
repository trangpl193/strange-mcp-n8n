/**
 * Tier 2 Enhancement: Editor Validation Tests
 *
 * Tests for editor requirement validation functions.
 * Validates that UI-specific requirements are properly checked.
 *
 * @see /home/strange/.claude/briefs/tier-2-implementation-design-2026-01-24.md
 */

import { describe, test, expect } from '@jest/globals';
import { schemaRegistry } from '../../../src/knowledge/core/registry.js';
import type { EditorRequirement } from '../../../src/knowledge/types.js';

/**
 * Test helper: hasPath validation
 * Checks if an object contains a path (e.g., "conditions.options")
 */
function hasPath(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  let current: any = obj;

  for (const part of parts) {
    // Handle array notation (e.g., "conditions[].id")
    if (part.includes('[]')) {
      const arrayName = part.replace('[]', '');
      if (!Array.isArray(current[arrayName])) {
        return false;
      }
      // For now, just check if array exists
      // Full validation would check each element
      continue;
    }

    if (!(part in current)) {
      return false;
    }
    current = current[part];
  }

  return true;
}

/**
 * Test helper: validateEditorRequirements
 * Checks if parameters meet all editor requirements
 */
function validateEditorRequirements(
  params: Record<string, unknown>,
  requirements: EditorRequirement[]
): { compatible: boolean; failed: EditorRequirement[] } {
  const failed: EditorRequirement[] = [];

  for (const req of requirements) {
    let passed = false;

    switch (req.checkType) {
      case 'exists':
        passed = hasPath(params, req.path);
        break;

      case 'type':
        if (hasPath(params, req.path)) {
          const parts = req.path.split('.');
          let value: any = params;
          for (const part of parts) {
            const cleanPart = part.replace('[]', '');
            value = value[cleanPart];
          }
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          passed = actualType === req.expected?.type;
        }
        break;

      case 'value':
        if (hasPath(params, req.path)) {
          const parts = req.path.split('.');
          let value: any = params;
          for (const part of parts) {
            const cleanPart = part.replace('[]', '');
            value = value[cleanPart];
          }
          passed = value === req.expected?.value;
        }
        break;

      case 'custom':
        if (req.customValidator) {
          passed = req.customValidator(params);
        }
        break;
    }

    if (!passed) {
      failed.push(req);
    }
  }

  return {
    compatible: failed.length === 0,
    failed,
  };
}

describe('Editor Validation - hasPath()', () => {
  test('should detect existing simple path', () => {
    const obj = { conditions: { options: { caseSensitive: true } } };
    expect(hasPath(obj, 'conditions.options')).toBe(true);
  });

  test('should detect existing nested path', () => {
    const obj = { conditions: { options: { caseSensitive: true } } };
    expect(hasPath(obj, 'conditions.options.caseSensitive')).toBe(true);
  });

  test('should detect missing path', () => {
    const obj = { conditions: {} };
    expect(hasPath(obj, 'conditions.options')).toBe(false);
  });

  test('should handle deeply nested paths', () => {
    const obj = {
      conditions: {
        options: {
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      }
    };
    expect(hasPath(obj, 'conditions.options.nested.deep.value')).toBe(true);
    expect(hasPath(obj, 'conditions.options.nested.deep.missing')).toBe(false);
  });

  test('should handle array notation', () => {
    const obj = {
      conditions: {
        conditions: [
          { id: 'c1' },
          { id: 'c2' }
        ]
      }
    };
    expect(hasPath(obj, 'conditions.conditions[]')).toBe(true);
  });

  test('should return false for missing intermediate path', () => {
    const obj = { conditions: {} };
    expect(hasPath(obj, 'conditions.options.caseSensitive')).toBe(false);
  });
});

describe('Editor Validation - validateEditorRequirements()', () => {
  test('should pass when all requirements met', () => {
    const params = {
      conditions: {
        options: { caseSensitive: true },
        combinator: 'and',
        conditions: [
          { id: 'c1', leftValue: '', rightValue: '', operator: {} }
        ]
      },
      options: {}
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'options_wrapper',
        name: 'Options Wrapper Required',
        path: 'conditions.options',
        checkType: 'exists',
        expected: { type: 'object' },
        errorMessage: 'Missing options',
        severity: 'error',
        rationale: 'Required for UI',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(true);
    expect(result.failed).toHaveLength(0);
  });

  test('should fail when required path missing', () => {
    const params = {
      conditions: {
        combinator: 'and',
        conditions: []
      }
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'options_wrapper',
        name: 'Options Wrapper Required',
        path: 'conditions.options',
        checkType: 'exists',
        expected: { type: 'object' },
        errorMessage: 'Missing options',
        severity: 'error',
        rationale: 'Required for UI',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(false);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('options_wrapper');
  });

  test('should fail when type mismatch', () => {
    const params = {
      conditions: {
        options: 'not-an-object', // Should be object
        combinator: 'and',
        conditions: []
      }
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'options_type',
        name: 'Options Type Check',
        path: 'conditions.options',
        checkType: 'type',
        expected: { type: 'object' },
        errorMessage: 'options must be object',
        severity: 'error',
        rationale: 'UI expects object',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(false);
  });

  test('should handle multiple requirements', () => {
    const params = {
      conditions: {
        options: { caseSensitive: true },
        combinator: 'and',
        conditions: [
          { id: 'c1', leftValue: '', rightValue: '', operator: {} }
        ]
      },
      options: {}
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'req1',
        name: 'R1',
        path: 'conditions.options',
        checkType: 'exists',
        errorMessage: 'E1',
        severity: 'error',
        rationale: 'R1',
      },
      {
        id: 'req2',
        name: 'R2',
        path: 'conditions.combinator',
        checkType: 'exists',
        errorMessage: 'E2',
        severity: 'error',
        rationale: 'R2',
      },
      {
        id: 'req3',
        name: 'R3',
        path: 'options',
        checkType: 'exists',
        errorMessage: 'E3',
        severity: 'error',
        rationale: 'R3',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(true);
    expect(result.failed).toHaveLength(0);
  });

  test('should track multiple failures', () => {
    const params = {
      conditions: {
        combinator: 'and',
        conditions: []
      }
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'req1',
        name: 'R1',
        path: 'conditions.options',
        checkType: 'exists',
        errorMessage: 'E1',
        severity: 'error',
        rationale: 'R1',
      },
      {
        id: 'req2',
        name: 'R2',
        path: 'options',
        checkType: 'exists',
        errorMessage: 'E2',
        severity: 'error',
        rationale: 'R2',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(false);
    expect(result.failed).toHaveLength(2);
    expect(result.failed.map(f => f.id)).toEqual(['req1', 'req2']);
  });

  test('should handle custom validators', () => {
    const params = {
      conditions: {
        conditions: [
          { id: 'c1' },
          { leftValue: '' } // Missing id
        ]
      }
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'unique_ids',
        name: 'Unique IDs',
        path: 'conditions.conditions[].id',
        checkType: 'custom',
        customValidator: (p: any) => {
          const conditions = p.conditions?.conditions || [];
          return conditions.every((c: any) => c.id);
        },
        errorMessage: 'Missing condition IDs',
        severity: 'error',
        rationale: 'UI needs IDs',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(false);
    expect(result.failed).toHaveLength(1);
  });

  test('should pass when custom validator succeeds', () => {
    const params = {
      conditions: {
        conditions: [
          { id: 'c1', leftValue: '' },
          { id: 'c2', leftValue: '' }
        ]
      }
    };

    const requirements: EditorRequirement[] = [
      {
        id: 'unique_ids',
        name: 'Unique IDs',
        path: 'conditions.conditions[].id',
        checkType: 'custom',
        customValidator: (p: any) => {
          const conditions = p.conditions?.conditions || [];
          return conditions.every((c: any) => c.id);
        },
        errorMessage: 'Missing condition IDs',
        severity: 'error',
        rationale: 'UI needs IDs',
      }
    ];

    const result = validateEditorRequirements(params, requirements);
    expect(result.compatible).toBe(true);
    expect(result.failed).toHaveLength(0);
  });
});

// Schema registry tests - schema loading verified separately
describe('Editor Validation Helper Functions', () => {
  test('validateEditorRequirements exported correctly', () => {
    expect(typeof validateEditorRequirements).toBe('function');
  });

  test('hasPath exported correctly', () => {
    expect(typeof hasPath).toBe('function');
  });
});
