/**
 * Knowledge Layer Registry Tests
 *
 * Tests for schema registry and core knowledge layer functionality.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { schemaRegistry, initializeCoreSchemas } from '../../../src/knowledge/index.js';

describe('Knowledge Layer - Schema Registry', () => {
  beforeAll(async () => {
    // Initialize schemas before tests
    await initializeCoreSchemas();
  });

  describe('Schema Retrieval', () => {
    test('should retrieve If-node schema', () => {
      const schema = schemaRegistry.getSchema('if', 1);

      expect(schema).not.toBeNull();
      expect(schema?.nodeType).toBe('if');
      expect(schema?.n8nType).toBe('n8n-nodes-base.if');
      expect(schema?.typeVersion).toBe(1);
    });

    test('should retrieve Switch-node schema', () => {
      const schema = schemaRegistry.getSchema('switch', 1);

      expect(schema).not.toBeNull();
      expect(schema?.nodeType).toBe('switch');
      expect(schema?.n8nType).toBe('n8n-nodes-base.switch');
      expect(schema?.typeVersion).toBe(1);
    });

    test('should retrieve Filter-node schema', () => {
      const schema = schemaRegistry.getSchema('filter', 2);

      expect(schema).not.toBeNull();
      expect(schema?.nodeType).toBe('filter');
      expect(schema?.n8nType).toBe('n8n-nodes-base.filter');
      expect(schema?.typeVersion).toBe(2);
    });

    test('should return null for unknown node type', () => {
      const schema = schemaRegistry.getSchema('unknown', 1);
      expect(schema).toBeNull();
    });
  });

  describe('Schema Formats', () => {
    test('If-node should have combinator format (recommended)', () => {
      const schema = schemaRegistry.getSchema('if', 1);
      const combinator = schema?.formats.find((f) => f.name === 'combinator');

      expect(combinator).toBeDefined();
      expect(combinator?.status).toBe('recommended');
      expect(combinator?.uiCompatible).toBe(true);
      expect(combinator?.apiCompatible).toBe(true);
    });

    test('If-node should have legacy_options format (deprecated)', () => {
      const schema = schemaRegistry.getSchema('if', 1);
      const legacy = schema?.formats.find((f) => f.name === 'legacy_options');

      expect(legacy).toBeDefined();
      expect(legacy?.status).toBe('deprecated');
      expect(legacy?.uiCompatible).toBe(false);
      expect(legacy?.apiCompatible).toBe(true);
    });

    test('Switch-node should have rules format (recommended)', () => {
      const schema = schemaRegistry.getSchema('switch', 1);
      const rules = schema?.formats.find((f) => f.name === 'rules');

      expect(rules).toBeDefined();
      expect(rules?.status).toBe('recommended');
      expect(rules?.uiCompatible).toBe(true);
    });

    test('Filter-node should have conditions format (recommended)', () => {
      const schema = schemaRegistry.getSchema('filter', 2);
      const conditions = schema?.formats.find((f) => f.name === 'conditions');

      expect(conditions).toBeDefined();
      expect(conditions?.status).toBe('recommended');
      expect(conditions?.uiCompatible).toBe(true);
    });
  });

  describe('Quirks Database', () => {
    test('should retrieve If-node quirks', () => {
      const quirks = schemaRegistry.getQuirks('if');

      expect(quirks).toHaveLength(1);
      expect(quirks[0].id).toBe('if-node-dual-format');
    });

    test('If-node dual-format quirk should be critical', () => {
      const quirks = schemaRegistry.getQuirks('if');
      const dualFormat = quirks.find((q) => q.id === 'if-node-dual-format');

      expect(dualFormat).toBeDefined();
      expect(dualFormat?.severity).toBe('critical');
      expect(dualFormat?.autoFixAvailable).toBe(true);
    });

    test('should search quirks by symptoms', () => {
      const quirks = schemaRegistry.searchQuirksBySymptoms(['empty', 'canvas']);

      expect(quirks.length).toBeGreaterThan(0);
      expect(quirks[0].id).toBe('if-node-dual-format');
    });

    test('should return empty array for non-existent node quirks', () => {
      const quirks = schemaRegistry.getQuirks('unknown-node');
      expect(quirks).toEqual([]);
    });
  });

  describe('Schema Listing', () => {
    test('should list all schemas', () => {
      const schemas = schemaRegistry.listSchemas();

      expect(schemas.length).toBeGreaterThanOrEqual(3);
      expect(schemas.some((s) => s.nodeType === 'if')).toBe(true);
      expect(schemas.some((s) => s.nodeType === 'switch')).toBe(true);
      expect(schemas.some((s) => s.nodeType === 'filter')).toBe(true);
    });

    test('should filter schemas by recommended status', () => {
      const schemas = schemaRegistry.listSchemas({ status: 'recommended' });

      expect(schemas.length).toBeGreaterThan(0);
      schemas.forEach((schema) => {
        const hasRecommended = schema.formats.some((f) => f.status === 'recommended');
        expect(hasRecommended).toBe(true);
      });
    });
  });

  describe('Schema Metadata', () => {
    test('If-node should have validation metadata', () => {
      const schema = schemaRegistry.getSchema('if', 1);

      expect(schema?.metadata).toBeDefined();
      expect(schema?.metadata.source).toBe('ui_created');
      expect(schema?.metadata.validatedBy).toBe('uat_testing');
      expect(schema?.metadata.n8nVersion).toBe('1.20.0');
    });

    test('all schemas should have validated metadata', () => {
      const schemas = schemaRegistry.listSchemas();

      schemas.forEach((schema) => {
        expect(schema.metadata.validatedDate).toBeDefined();
        expect(schema.metadata.n8nVersion).toBeDefined();
      });
    });
  });
});
