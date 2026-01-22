/**
 * Knowledge Layer MCP Tools Tests
 *
 * Tests for MCP tool implementations including schema_get, schema_list,
 * quirks_check, quirks_search, and schema_validate.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import {
  schema_get,
  schema_list,
  quirks_check,
  quirks_search,
  schema_validate,
  initializeCoreSchemas,
} from '../../../src/knowledge/index.js';

describe('Knowledge Layer - MCP Tools', () => {
  beforeAll(async () => {
    // Initialize schemas before tests
    await initializeCoreSchemas();
  });

  describe('schema_get()', () => {
    test('should retrieve If-node schema by type', async () => {
      const schema = await schema_get('if');

      expect(schema).toBeDefined();
      expect(schema.nodeType).toBe('if');
      expect(schema.n8nType).toBe('n8n-nodes-base.if');
      expect(schema.typeVersion).toBe(1);
      expect(schema.formats).toHaveLength(2);
    });

    test('should retrieve Switch-node schema with version', async () => {
      const schema = await schema_get('switch', 1);

      expect(schema).toBeDefined();
      expect(schema.nodeType).toBe('switch');
      expect(schema.formats.length).toBeGreaterThan(0);
    });

    test('should retrieve Filter-node schema', async () => {
      const schema = await schema_get('filter', 2);

      expect(schema).toBeDefined();
      expect(schema.nodeType).toBe('filter');
      expect(schema.typeVersion).toBe(2);
    });

    test('should throw error for unknown node type', async () => {
      await expect(schema_get('unknown-node')).rejects.toThrow(/Schema not found/);
    });

    test('should include list of available types in error', async () => {
      try {
        await schema_get('unknown-node');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Available types:');
        expect((error as Error).message).toContain('if');
        expect((error as Error).message).toContain('switch');
        expect((error as Error).message).toContain('filter');
      }
    });
  });

  describe('schema_list()', () => {
    test('should list all available schemas', async () => {
      const schemas = await schema_list();

      expect(schemas).toBeDefined();
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThanOrEqual(3);

      const nodeTypes = schemas.map((s) => s.nodeType);
      expect(nodeTypes).toContain('if');
      expect(nodeTypes).toContain('switch');
      expect(nodeTypes).toContain('filter');
    });

    test('should filter schemas by recommended status', async () => {
      const schemas = await schema_list({ status: 'recommended' });

      expect(schemas.length).toBeGreaterThan(0);
      schemas.forEach((schema) => {
        const hasRecommended = schema.formats.some((f) => f.status === 'recommended');
        expect(hasRecommended).toBe(true);
      });
    });

    test('should filter schemas by deprecated status', async () => {
      const schemas = await schema_list({ status: 'deprecated' });

      schemas.forEach((schema) => {
        const hasDeprecated = schema.formats.some((f) => f.status === 'deprecated');
        expect(hasDeprecated).toBe(true);
      });
    });

    test('each schema should have required fields', async () => {
      const schemas = await schema_list();

      schemas.forEach((schema) => {
        expect(schema.nodeType).toBeDefined();
        expect(schema.n8nType).toBeDefined();
        expect(schema.typeVersion).toBeDefined();
        expect(schema.formats).toBeDefined();
        expect(schema.metadata).toBeDefined();
        expect(Array.isArray(schema.formats)).toBe(true);
      });
    });
  });

  describe('quirks_check()', () => {
    test('should retrieve If-node quirks', async () => {
      const quirks = await quirks_check('if');

      expect(Array.isArray(quirks)).toBe(true);
      expect(quirks.length).toBeGreaterThan(0);
      expect(quirks[0].id).toBe('if-node-dual-format');
    });

    test('should filter quirks by type version', async () => {
      const quirks = await quirks_check('if', 1);

      expect(Array.isArray(quirks)).toBe(true);
      quirks.forEach((quirk) => {
        expect(quirk.affectedVersions.nodeTypeVersion).toContain(1);
      });
    });

    test('should return empty array for nodes without quirks', async () => {
      const quirks = await quirks_check('filter');

      expect(Array.isArray(quirks)).toBe(true);
      expect(quirks).toEqual([]);
    });

    test('should return empty array for unknown node types', async () => {
      const quirks = await quirks_check('unknown-node');

      expect(Array.isArray(quirks)).toBe(true);
      expect(quirks).toEqual([]);
    });

    test('quirk should have all required fields', async () => {
      const quirks = await quirks_check('if');

      expect(quirks.length).toBeGreaterThan(0);
      const quirk = quirks[0];

      expect(quirk.id).toBeDefined();
      expect(quirk.title).toBeDefined();
      expect(quirk.affectedNodes).toBeDefined();
      expect(quirk.severity).toBeDefined();
      expect(quirk.symptoms).toBeDefined();
      expect(quirk.workaround).toBeDefined();
      expect(quirk.autoFixAvailable).toBeDefined();
    });
  });

  describe('quirks_search()', () => {
    test('should find quirks by single symptom', async () => {
      const quirks = await quirks_search(['empty']);

      expect(quirks.length).toBeGreaterThan(0);
      expect(quirks[0].id).toBe('if-node-dual-format');
    });

    test('should find quirks by multiple symptoms', async () => {
      const quirks = await quirks_search(['empty', 'canvas']);

      expect(quirks.length).toBeGreaterThan(0);
      expect(quirks[0].symptoms.some((s) => s.toLowerCase().includes('empty'))).toBe(true);
    });

    test('should return empty array when no symptoms match', async () => {
      const quirks = await quirks_search(['nonexistent-symptom-xyz']);

      expect(Array.isArray(quirks)).toBe(true);
      expect(quirks.length).toBe(0);
    });

    test('should be case-insensitive', async () => {
      const quirksLower = await quirks_search(['empty']);
      const quirksUpper = await quirks_search(['EMPTY']);
      const quirksMixed = await quirks_search(['EmPtY']);

      expect(quirksLower).toEqual(quirksUpper);
      expect(quirksLower).toEqual(quirksMixed);
    });

    test('should handle empty symptoms array', async () => {
      const quirks = await quirks_search([]);

      expect(Array.isArray(quirks)).toBe(true);
      expect(quirks.length).toBe(0);
    });
  });

  describe('schema_validate()', () => {
    test('should validate correct combinator format for If-node', async () => {
      const result = await schema_validate('if', {
        conditions: {
          combinator: 'and',
          conditions: [
            {
              leftValue: '={{ $json.status }}',
              rightValue: 'active',
              operator: { type: 'string', operation: 'equals' },
            },
          ],
        },
      });

      expect(result.valid).toBe(true);
      expect(result.matchedFormat).toBe('combinator');
      expect(result.errors).toHaveLength(0);
    });

    test('should validate legacy format and warn deprecated', async () => {
      const result = await schema_validate('if', {
        conditions: {
          string: [
            {
              value1: '={{ $json.status }}',
              value2: 'active',
              operation: 'equal',
            },
          ],
        },
      });

      expect(result.valid).toBe(true);
      expect(result.matchedFormat).toBe('legacy_options');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes('deprecated'))).toBe(true);
    });

    test('should warn about UI-incompatible formats', async () => {
      const result = await schema_validate('if', {
        conditions: {
          options: {},
          string: [{ value1: 'test', value2: 'test', operation: 'equal' }],
        },
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('not UI-compatible'))).toBe(true);
    });

    test('should invalidate incorrect format', async () => {
      const result = await schema_validate('if', {
        wrongField: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('do not match any known format');
    });

    test('should validate Switch-node rules format', async () => {
      const result = await schema_validate('switch', {
        mode: 'rules',
        rules: {
          values: [
            {
              conditions: {
                combinator: 'and',
                conditions: [
                  {
                    leftValue: '={{ $json.type }}',
                    rightValue: 'user',
                    operator: { type: 'string', operation: 'equals' },
                  },
                ],
              },
              renameOutput: true,
              outputKey: 'users',
            },
          ],
        },
      });

      expect(result.valid).toBe(true);
      expect(result.matchedFormat).toBe('rules');
    });

    test('should validate Filter-node conditions format', async () => {
      const result = await schema_validate(
        'filter',
        {
          conditions: {
            combinator: 'and',
            conditions: [
              {
                leftValue: '={{ $json.active }}',
                rightValue: true,
                operator: { type: 'boolean', operation: 'true' },
              },
            ],
          },
        },
        2
      );

      expect(result.valid).toBe(true);
      expect(result.matchedFormat).toBe('conditions');
    });

    test('should provide suggestions when validation fails', async () => {
      const result = await schema_validate('if', {
        invalid: 'structure',
      });

      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain('combinator');
      expect(result.suggestion).toContain('legacy_options');
    });
  });
});
