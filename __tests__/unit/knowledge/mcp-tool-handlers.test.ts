/**
 * Knowledge Layer MCP Tool Handlers Tests
 *
 * Tests for MCP protocol handlers that bridge AI agent calls to knowledge layer.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import {
  handleSchemaGet,
  handleSchemaList,
  handleQuirksCheck,
  handleQuirksSearch,
  handleSchemaValidate,
  initializeCoreSchemas,
} from '../../../src/knowledge/index.js';

describe('Knowledge Layer - MCP Tool Handlers', () => {
  beforeAll(async () => {
    // Initialize schemas before tests
    await initializeCoreSchemas();
  });

  describe('handleSchemaGet()', () => {
    test('should return success with schema data', async () => {
      const result = await handleSchemaGet({ nodeType: 'if' });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('schema');

      const resultObj = result as { success: boolean; schema: any };
      expect(resultObj.schema.nodeType).toBe('if');
      expect(resultObj.schema.n8nType).toBe('n8n-nodes-base.if');
    });

    test('should include version when specified', async () => {
      const result = await handleSchemaGet({ nodeType: 'switch', typeVersion: 1 });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('schema');

      const resultObj = result as { success: boolean; schema: any };
      expect(resultObj.schema.typeVersion).toBe(1);
    });

    test('should return error for unknown node type', async () => {
      const result = await handleSchemaGet({ nodeType: 'unknown-node' });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');

      const resultObj = result as { success: boolean; error: string };
      expect(resultObj.error).toContain('Schema not found');
    });
  });

  describe('handleSchemaList()', () => {
    test('should return success with schemas array', async () => {
      const result = await handleSchemaList();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('schemas');
      expect(result).toHaveProperty('count');

      const resultObj = result as { success: boolean; schemas: any[]; count: number };
      expect(Array.isArray(resultObj.schemas)).toBe(true);
      expect(resultObj.count).toBeGreaterThanOrEqual(3);
      expect(resultObj.count).toBe(resultObj.schemas.length);
    });

    test('should filter by status when provided', async () => {
      const result = await handleSchemaList({ status: 'recommended' });

      expect(result).toHaveProperty('success', true);

      const resultObj = result as { success: boolean; schemas: any[] };
      expect(resultObj.schemas.length).toBeGreaterThan(0);
    });

    test('should handle all status filters', async () => {
      const recommended = await handleSchemaList({ status: 'recommended' });
      const deprecated = await handleSchemaList({ status: 'deprecated' });
      const experimental = await handleSchemaList({ status: 'experimental' });

      expect(recommended).toHaveProperty('success', true);
      expect(deprecated).toHaveProperty('success', true);
      expect(experimental).toHaveProperty('success', true);
    });
  });

  describe('handleQuirksCheck()', () => {
    test('should return success with quirks data', async () => {
      const result = await handleQuirksCheck({ nodeType: 'if' });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('quirks');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('hasCritical');
      expect(result).toHaveProperty('hasWarnings');

      const resultObj = result as {
        success: boolean;
        quirks: any[];
        count: number;
        hasCritical: boolean;
        hasWarnings: boolean;
      };
      expect(resultObj.count).toBe(resultObj.quirks.length);
      expect(resultObj.count).toBeGreaterThan(0);
    });

    test('should detect critical quirks', async () => {
      const result = await handleQuirksCheck({ nodeType: 'if' });

      const resultObj = result as { hasCritical: boolean };
      expect(resultObj.hasCritical).toBe(true);
    });

    test('should return empty quirks for nodes without issues', async () => {
      const result = await handleQuirksCheck({ nodeType: 'filter' });

      expect(result).toHaveProperty('success', true);

      const resultObj = result as {
        quirks: any[];
        count: number;
        hasCritical: boolean;
        hasWarnings: boolean;
      };
      expect(resultObj.count).toBe(0);
      expect(resultObj.quirks).toEqual([]);
      expect(resultObj.hasCritical).toBe(false);
      expect(resultObj.hasWarnings).toBe(false);
    });

    test('should filter by type version when provided', async () => {
      const result = await handleQuirksCheck({ nodeType: 'if', typeVersion: 1 });

      expect(result).toHaveProperty('success', true);

      const resultObj = result as { quirks: any[] };
      resultObj.quirks.forEach((quirk) => {
        expect(quirk.affectedVersions.nodeTypeVersion).toContain(1);
      });
    });
  });

  describe('handleQuirksSearch()', () => {
    test('should return success with search results', async () => {
      const result = await handleQuirksSearch({ symptoms: ['empty', 'canvas'] });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('quirks');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('searchedSymptoms');

      const resultObj = result as {
        success: boolean;
        quirks: any[];
        count: number;
        searchedSymptoms: string[];
      };
      expect(resultObj.count).toBe(resultObj.quirks.length);
      expect(resultObj.searchedSymptoms).toEqual(['empty', 'canvas']);
    });

    test('should find quirks by symptoms', async () => {
      const result = await handleQuirksSearch({ symptoms: ['empty'] });

      const resultObj = result as { quirks: any[]; count: number };
      expect(resultObj.count).toBeGreaterThan(0);
      expect(resultObj.quirks[0].id).toBe('if-node-dual-format');
    });

    test('should return empty results for non-matching symptoms', async () => {
      const result = await handleQuirksSearch({ symptoms: ['nonexistent-xyz'] });

      expect(result).toHaveProperty('success', true);

      const resultObj = result as { quirks: any[]; count: number };
      expect(resultObj.count).toBe(0);
      expect(resultObj.quirks).toEqual([]);
    });

    test('should handle multiple symptoms', async () => {
      const result = await handleQuirksSearch({
        symptoms: ['empty', 'canvas', 'could not find']
      });

      expect(result).toHaveProperty('success', true);

      const resultObj = result as { searchedSymptoms: string[] };
      expect(resultObj.searchedSymptoms).toHaveLength(3);
    });
  });

  describe('handleSchemaValidate()', () => {
    test('should return success with validation result', async () => {
      const result = await handleSchemaValidate({
        nodeType: 'if',
        parameters: {
          conditions: {
            combinator: 'and',
            conditions: [],
          },
        },
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('validation');

      const resultObj = result as { success: boolean; validation: any };
      expect(resultObj.validation).toHaveProperty('valid');
      expect(resultObj.validation).toHaveProperty('matchedFormat');
      expect(resultObj.validation).toHaveProperty('errors');
      expect(resultObj.validation).toHaveProperty('warnings');
    });

    test('should validate correct format', async () => {
      const result = await handleSchemaValidate({
        nodeType: 'if',
        parameters: {
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
        },
      });

      const resultObj = result as { validation: any };
      expect(resultObj.validation.valid).toBe(true);
      expect(resultObj.validation.matchedFormat).toBe('combinator');
      expect(resultObj.validation.errors).toHaveLength(0);
    });

    test('should detect deprecated formats with warnings', async () => {
      const result = await handleSchemaValidate({
        nodeType: 'if',
        parameters: {
          conditions: {
            string: [
              {
                value1: '={{ $json.status }}',
                value2: 'active',
                operation: 'equal',
              },
            ],
          },
        },
      });

      const resultObj = result as { validation: any };
      expect(resultObj.validation.valid).toBe(true);
      expect(resultObj.validation.matchedFormat).toBe('legacy_options');
      expect(resultObj.validation.warnings.length).toBeGreaterThan(0);
    });

    test('should invalidate incorrect format', async () => {
      const result = await handleSchemaValidate({
        nodeType: 'if',
        parameters: {
          wrongField: 'invalid',
        },
      });

      const resultObj = result as { validation: any };
      expect(resultObj.validation.valid).toBe(false);
      expect(resultObj.validation.errors.length).toBeGreaterThan(0);
    });

    test('should handle type version parameter', async () => {
      const result = await handleSchemaValidate({
        nodeType: 'filter',
        parameters: {
          conditions: {
            combinator: 'and',
            conditions: [],
          },
        },
        typeVersion: 2,
      });

      expect(result).toHaveProperty('success', true);

      const resultObj = result as { validation: any };
      expect(resultObj.validation.valid).toBe(true);
    });

    test('should return error for unknown node type', async () => {
      const result = await handleSchemaValidate({
        nodeType: 'unknown-node',
        parameters: {},
      });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('all handlers should return consistent error format', async () => {
      const handlers = [
        () => handleSchemaGet({ nodeType: 'unknown' }),
        () => handleSchemaValidate({ nodeType: 'unknown', parameters: {} }),
      ];

      for (const handler of handlers) {
        const result = await handler();

        expect(result).toHaveProperty('success', false);
        expect(result).toHaveProperty('error');
        expect(typeof (result as any).error).toBe('string');
      }
    });

    test('handlers should not throw exceptions', async () => {
      // All handlers should catch errors and return error objects
      const operations = [
        handleSchemaGet({ nodeType: 'unknown' }),
        handleQuirksCheck({ nodeType: 'unknown' }),
        handleSchemaValidate({ nodeType: 'unknown', parameters: {} }),
      ];

      for (const op of operations) {
        await expect(op).resolves.toBeDefined();
      }
    });
  });
});
