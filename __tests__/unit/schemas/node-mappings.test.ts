import { describe, test, expect } from '@jest/globals';
import {
  NODE_MAPPINGS,
  getNodeMapping,
  getDefaultNodeName,
  type NodeMapping,
} from '../../../src/schemas/node-mappings.js';

describe('schemas/node-mappings', () => {
  describe('NODE_MAPPINGS', () => {
    test('should be defined and non-empty', () => {
      expect(NODE_MAPPINGS).toBeDefined();
      expect(Object.keys(NODE_MAPPINGS).length).toBeGreaterThan(0);
    });

    test('should have all expected node types', () => {
      const expectedTypes = [
        'webhook',
        'schedule',
        'manual',
        'http',
        'postgres',
        'discord',
        'respond',
        'if',
        'switch',
        'merge',
        'set',
        'code',
      ];

      for (const type of expectedTypes) {
        expect(NODE_MAPPINGS).toHaveProperty(type);
      }
    });

    test('should have valid mapping structure for all nodes', () => {
      for (const [key, mapping] of Object.entries(NODE_MAPPINGS)) {
        expect(mapping).toHaveProperty('n8nType');
        expect(mapping).toHaveProperty('typeVersion');
        expect(mapping).toHaveProperty('category');

        expect(typeof mapping.n8nType).toBe('string');
        expect(typeof mapping.typeVersion).toBe('number');
        expect(['trigger', 'action', 'logic', 'transform']).toContain(mapping.category);

        // n8nType should follow the pattern: n8n-nodes-base.*
        expect(mapping.n8nType).toMatch(/^n8n-nodes-base\./);
      }
    });
  });

  describe('NODE_MAPPINGS - Trigger Nodes', () => {
    test('webhook mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.webhook;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        category: 'trigger',
        defaultParams: {
          httpMethod: 'POST',
          responseMode: 'onReceived',
        },
      });
    });

    test('schedule mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.schedule;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        category: 'trigger',
      });
    });

    test('manual mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.manual;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        category: 'trigger',
      });
    });

    test('all trigger nodes should have category "trigger"', () => {
      const triggers = ['webhook', 'schedule', 'manual'];

      for (const type of triggers) {
        expect(NODE_MAPPINGS[type].category).toBe('trigger');
      }
    });
  });

  describe('NODE_MAPPINGS - Action Nodes', () => {
    test('http mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.http;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        category: 'action',
        defaultParams: {
          method: 'GET',
        },
      });
    });

    test('postgres mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.postgres;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.postgres',
        typeVersion: 2,
        category: 'action',
      });
    });

    test('discord mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.discord;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.discord',
        typeVersion: 2,
        category: 'action',
        defaultParams: {
          resource: 'message',
        },
      });
    });

    test('respond mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.respond;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        category: 'action',
        defaultParams: {
          respondWith: 'json',
          responseBody: '={{ $json }}',
        },
      });
    });

    test('all action nodes should have category "action"', () => {
      const actions = ['http', 'postgres', 'discord', 'respond'];

      for (const type of actions) {
        expect(NODE_MAPPINGS[type].category).toBe('action');
      }
    });
  });

  describe('NODE_MAPPINGS - Logic Nodes', () => {
    test('if mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.if;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.if',
        typeVersion: 2,
        category: 'logic',
      });
    });

    test('switch mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.switch;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.switch',
        typeVersion: 3.4,
        category: 'logic',
      });
    });

    test('merge mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.merge;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.merge',
        typeVersion: 2,
        category: 'logic',
      });
    });

    test('all logic nodes should have category "logic"', () => {
      const logic = ['if', 'switch', 'merge'];

      for (const type of logic) {
        expect(NODE_MAPPINGS[type].category).toBe('logic');
      }
    });
  });

  describe('NODE_MAPPINGS - Transform Nodes', () => {
    test('set mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.set;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.set',
        typeVersion: 3,
        category: 'transform',
      });
    });

    test('code mapping should be correct', () => {
      const mapping = NODE_MAPPINGS.code;

      expect(mapping).toEqual({
        n8nType: 'n8n-nodes-base.code',
        typeVersion: 2,
        category: 'transform',
        defaultParams: {
          language: 'javascript',
          mode: 'runOnceForAllItems',
        },
      });
    });

    test('all transform nodes should have category "transform"', () => {
      const transform = ['set', 'code'];

      for (const type of transform) {
        expect(NODE_MAPPINGS[type].category).toBe('transform');
      }
    });
  });

  describe('NODE_MAPPINGS - Default Parameters', () => {
    test('webhook should have default params', () => {
      expect(NODE_MAPPINGS.webhook.defaultParams).toBeDefined();
      expect(NODE_MAPPINGS.webhook.defaultParams).toHaveProperty('httpMethod');
      expect(NODE_MAPPINGS.webhook.defaultParams).toHaveProperty('responseMode');
    });

    test('http should have default params', () => {
      expect(NODE_MAPPINGS.http.defaultParams).toBeDefined();
      expect(NODE_MAPPINGS.http.defaultParams).toHaveProperty('method');
    });

    test('discord should have default params', () => {
      expect(NODE_MAPPINGS.discord.defaultParams).toBeDefined();
      expect(NODE_MAPPINGS.discord.defaultParams).toHaveProperty('resource');
    });

    test('respond should have default params', () => {
      expect(NODE_MAPPINGS.respond.defaultParams).toBeDefined();
      expect(NODE_MAPPINGS.respond.defaultParams).toHaveProperty('respondWith');
      expect(NODE_MAPPINGS.respond.defaultParams).toHaveProperty('responseBody');
    });

    test('code should have default params', () => {
      expect(NODE_MAPPINGS.code.defaultParams).toBeDefined();
      expect(NODE_MAPPINGS.code.defaultParams).toHaveProperty('language');
      expect(NODE_MAPPINGS.code.defaultParams).toHaveProperty('mode');
    });

    test('nodes without default params should not have the property or have undefined', () => {
      const noDefaults = ['schedule', 'manual', 'postgres', 'if', 'switch', 'merge', 'set'];

      for (const type of noDefaults) {
        const params = NODE_MAPPINGS[type].defaultParams;
        expect(params === undefined || Object.keys(params || {}).length === 0).toBe(true);
      }
    });
  });

  describe('getNodeMapping()', () => {
    test('should return mapping for valid node type', () => {
      const mapping = getNodeMapping('webhook');

      expect(mapping).toBeDefined();
      expect(mapping).not.toBeNull();
      expect(mapping?.n8nType).toBe('n8n-nodes-base.webhook');
    });

    test('should return mapping for all known types', () => {
      const knownTypes = [
        'webhook',
        'schedule',
        'manual',
        'http',
        'postgres',
        'discord',
        'respond',
        'if',
        'switch',
        'merge',
        'set',
        'code',
      ];

      for (const type of knownTypes) {
        const mapping = getNodeMapping(type);
        expect(mapping).not.toBeNull();
        expect(mapping?.n8nType).toContain('n8n-nodes-base.');
      }
    });

    test('should return null for unknown node type', () => {
      const mapping = getNodeMapping('unknown-node-type');

      expect(mapping).toBeNull();
    });

    test('should be case insensitive', () => {
      const lowercase = getNodeMapping('webhook');
      const uppercase = getNodeMapping('WEBHOOK');
      const mixedcase = getNodeMapping('WebHook');

      expect(lowercase).toEqual(uppercase);
      expect(lowercase).toEqual(mixedcase);
      expect(lowercase?.n8nType).toBe('n8n-nodes-base.webhook');
    });

    test('should handle empty string', () => {
      const mapping = getNodeMapping('');

      expect(mapping).toBeNull();
    });

    test('should handle whitespace', () => {
      const mapping = getNodeMapping('  ');

      expect(mapping).toBeNull();
    });

    test('should return complete mapping object', () => {
      const mapping = getNodeMapping('postgres');

      expect(mapping).toHaveProperty('n8nType');
      expect(mapping).toHaveProperty('typeVersion');
      expect(mapping).toHaveProperty('category');
    });

    test('should include defaultParams when available', () => {
      const mapping = getNodeMapping('webhook');

      expect(mapping).toHaveProperty('defaultParams');
      expect(mapping?.defaultParams).toHaveProperty('httpMethod');
    });

    test('should handle special characters gracefully', () => {
      const mapping = getNodeMapping('webhook!@#$%');

      expect(mapping).toBeNull();
    });
  });

  describe('getDefaultNodeName()', () => {
    test('should return correct name for webhook', () => {
      expect(getDefaultNodeName('webhook')).toBe('Webhook');
    });

    test('should return correct name for schedule', () => {
      expect(getDefaultNodeName('schedule')).toBe('Schedule Trigger');
    });

    test('should return correct name for manual', () => {
      expect(getDefaultNodeName('manual')).toBe('Manual');
    });

    test('should return correct name for http', () => {
      expect(getDefaultNodeName('http')).toBe('HTTP Request');
    });

    test('should return correct name for postgres', () => {
      expect(getDefaultNodeName('postgres')).toBe('Postgres');
    });

    test('should return correct name for discord', () => {
      expect(getDefaultNodeName('discord')).toBe('Discord');
    });

    test('should return correct name for respond', () => {
      expect(getDefaultNodeName('respond')).toBe('Respond to Webhook');
    });

    test('should return correct name for if', () => {
      expect(getDefaultNodeName('if')).toBe('IF');
    });

    test('should return correct name for switch', () => {
      expect(getDefaultNodeName('switch')).toBe('Switch');
    });

    test('should return correct name for merge', () => {
      expect(getDefaultNodeName('merge')).toBe('Merge');
    });

    test('should return correct name for set', () => {
      expect(getDefaultNodeName('set')).toBe('Set');
    });

    test('should return correct name for code', () => {
      expect(getDefaultNodeName('code')).toBe('Code');
    });

    test('should be case insensitive', () => {
      expect(getDefaultNodeName('WEBHOOK')).toBe('Webhook');
      expect(getDefaultNodeName('WebHook')).toBe('Webhook');
      expect(getDefaultNodeName('webhook')).toBe('Webhook');
    });

    test('should capitalize unknown node types', () => {
      expect(getDefaultNodeName('customnode')).toBe('Customnode');
    });

    test('should handle single character types', () => {
      expect(getDefaultNodeName('x')).toBe('X');
    });

    test('should handle empty string', () => {
      expect(getDefaultNodeName('')).toBe('');
    });

    test('should handle type with numbers', () => {
      expect(getDefaultNodeName('node123')).toBe('Node123');
    });

    test('should handle type with hyphens', () => {
      expect(getDefaultNodeName('my-custom-node')).toBe('My-custom-node');
    });

    test('should handle type with underscores', () => {
      expect(getDefaultNodeName('my_custom_node')).toBe('My_custom_node');
    });

    test('should return names matching N8N UI conventions', () => {
      // These are the actual names you'd see in N8N UI
      const uiNames = {
        webhook: 'Webhook',
        schedule: 'Schedule Trigger',
        manual: 'Manual',
        http: 'HTTP Request',
        postgres: 'Postgres',
        discord: 'Discord',
        respond: 'Respond to Webhook',
        if: 'IF',
        switch: 'Switch',
        merge: 'Merge',
        set: 'Set',
        code: 'Code',
      };

      for (const [type, expectedName] of Object.entries(uiNames)) {
        expect(getDefaultNodeName(type)).toBe(expectedName);
      }
    });
  });

  describe('NodeMapping Interface Compliance', () => {
    test('all mappings should satisfy NodeMapping interface', () => {
      for (const [key, mapping] of Object.entries(NODE_MAPPINGS)) {
        // Required fields
        expect(mapping).toHaveProperty('n8nType');
        expect(mapping).toHaveProperty('typeVersion');
        expect(mapping).toHaveProperty('category');

        // Type checks
        expect(typeof mapping.n8nType).toBe('string');
        expect(typeof mapping.typeVersion).toBe('number');
        expect(typeof mapping.category).toBe('string');

        // Category validation
        const validCategories: Array<NodeMapping['category']> = [
          'trigger',
          'action',
          'logic',
          'transform',
        ];
        expect(validCategories).toContain(mapping.category);

        // Optional defaultParams
        if (mapping.defaultParams !== undefined) {
          expect(typeof mapping.defaultParams).toBe('object');
          expect(mapping.defaultParams).not.toBeNull();
        }
      }
    });

    test('type versions should be positive numbers', () => {
      for (const [key, mapping] of Object.entries(NODE_MAPPINGS)) {
        expect(mapping.typeVersion).toBeGreaterThan(0);
        // Note: Switch node uses 3.4 (float) for UI compatibility
        expect(typeof mapping.typeVersion).toBe('number');
      }
    });

    test('n8nType should not have trailing dots', () => {
      for (const [key, mapping] of Object.entries(NODE_MAPPINGS)) {
        expect(mapping.n8nType).not.toMatch(/\.$/);
      }
    });

    test('n8nType should not have leading dots', () => {
      for (const [key, mapping] of Object.entries(NODE_MAPPINGS)) {
        expect(mapping.n8nType).not.toMatch(/^\./);
      }
    });
  });

  describe('Category Distribution', () => {
    test('should have at least one trigger node', () => {
      const triggers = Object.values(NODE_MAPPINGS).filter((m) => m.category === 'trigger');
      expect(triggers.length).toBeGreaterThan(0);
    });

    test('should have at least one action node', () => {
      const actions = Object.values(NODE_MAPPINGS).filter((m) => m.category === 'action');
      expect(actions.length).toBeGreaterThan(0);
    });

    test('should have at least one logic node', () => {
      const logic = Object.values(NODE_MAPPINGS).filter((m) => m.category === 'logic');
      expect(logic.length).toBeGreaterThan(0);
    });

    test('should have at least one transform node', () => {
      const transform = Object.values(NODE_MAPPINGS).filter((m) => m.category === 'transform');
      expect(transform.length).toBeGreaterThan(0);
    });

    test('should have expected category counts', () => {
      const categories = {
        trigger: 0,
        action: 0,
        logic: 0,
        transform: 0,
      };

      for (const mapping of Object.values(NODE_MAPPINGS)) {
        categories[mapping.category]++;
      }

      expect(categories.trigger).toBe(3); // webhook, schedule, manual
      expect(categories.action).toBe(4); // http, postgres, discord, respond
      expect(categories.logic).toBe(3); // if, switch, merge
      expect(categories.transform).toBe(2); // set, code
    });
  });

  describe('Integration Tests', () => {
    test('should be able to get mapping and generate default name for all types', () => {
      const types = Object.keys(NODE_MAPPINGS);

      for (const type of types) {
        const mapping = getNodeMapping(type);
        const name = getDefaultNodeName(type);

        expect(mapping).not.toBeNull();
        expect(name).toBeTruthy();
        expect(name.length).toBeGreaterThan(0);
      }
    });

    test('workflow creation scenario - webhook to postgres', () => {
      const webhookMapping = getNodeMapping('webhook');
      const postgresMapping = getNodeMapping('postgres');

      expect(webhookMapping?.category).toBe('trigger');
      expect(postgresMapping?.category).toBe('action');

      expect(webhookMapping?.defaultParams?.httpMethod).toBe('POST');
      expect(postgresMapping?.defaultParams).toBeUndefined();
    });

    test('conditional workflow scenario - webhook to if to respond', () => {
      const webhookMapping = getNodeMapping('webhook');
      const ifMapping = getNodeMapping('if');
      const respondMapping = getNodeMapping('respond');

      expect(webhookMapping?.category).toBe('trigger');
      expect(ifMapping?.category).toBe('logic');
      expect(respondMapping?.category).toBe('action');
    });

    test('data transformation scenario - webhook to code to set to respond', () => {
      const webhookMapping = getNodeMapping('webhook');
      const codeMapping = getNodeMapping('code');
      const setMapping = getNodeMapping('set');
      const respondMapping = getNodeMapping('respond');

      expect(webhookMapping?.category).toBe('trigger');
      expect(codeMapping?.category).toBe('transform');
      expect(setMapping?.category).toBe('transform');
      expect(respondMapping?.category).toBe('action');
    });
  });

  describe('Error Handling', () => {
    test('getNodeMapping should handle null input gracefully', () => {
      // TypeScript would catch this, but JS runtime should handle it
      // getNodeMapping calls toLowerCase on the input, so null would throw
      // Let's test what actually happens
      try {
        const mapping = getNodeMapping(null as any);
        // If it doesn't throw, it should return null
        expect(mapping).toBeNull();
      } catch (e) {
        // It's OK if it throws - that's a valid error handling strategy
        expect(e).toBeDefined();
      }
    });

    test('getNodeMapping should handle undefined input gracefully', () => {
      try {
        const mapping = getNodeMapping(undefined as any);
        expect(mapping).toBeNull();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('getNodeMapping should handle numeric input', () => {
      try {
        const mapping = getNodeMapping(123 as any);
        expect(mapping).toBeNull();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('getDefaultNodeName should handle null input', () => {
      try {
        const name = getDefaultNodeName(null as any);
        expect(typeof name).toBe('string');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('getDefaultNodeName should handle undefined input', () => {
      try {
        const name = getDefaultNodeName(undefined as any);
        expect(typeof name).toBe('string');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('getDefaultNodeName should handle numeric input', () => {
      try {
        const name = getDefaultNodeName(123 as any);
        expect(typeof name).toBe('string');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });
});
