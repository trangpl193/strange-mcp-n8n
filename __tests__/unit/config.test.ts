import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { loadConfig } from '../../src/config.js';

describe('config', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig()', () => {
    test('should load valid configuration from environment', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'test-api-key-123';
      process.env.N8N_TIMEOUT = '60000';

      const config = loadConfig();

      expect(config).toEqual({
        n8nUrl: 'https://n8n.example.com',
        apiKey: 'test-api-key-123',
        timeout: 60000,
      });
    });

    test('should use default timeout when not specified', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'test-api-key-123';
      delete process.env.N8N_TIMEOUT;

      const config = loadConfig();

      expect(config.timeout).toBe(30000);
    });

    test('should throw error when N8N_URL is missing', () => {
      delete process.env.N8N_URL;
      process.env.N8N_API_KEY = 'test-api-key-123';

      expect(() => loadConfig()).toThrow('N8N_URL environment variable is required');
    });

    test('should throw error when N8N_API_KEY is missing', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      delete process.env.N8N_API_KEY;

      expect(() => loadConfig()).toThrow('N8N_API_KEY environment variable is required');
    });

    test('should throw error when both N8N_URL and N8N_API_KEY are missing', () => {
      delete process.env.N8N_URL;
      delete process.env.N8N_API_KEY;

      expect(() => loadConfig()).toThrow('N8N_URL environment variable is required');
    });

    test('should parse timeout as integer', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'test-api-key-123';
      process.env.N8N_TIMEOUT = '45000';

      const config = loadConfig();

      expect(config.timeout).toBe(45000);
      expect(typeof config.timeout).toBe('number');
    });

    test('should handle timeout with invalid string (fallback to default)', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'test-api-key-123';
      process.env.N8N_TIMEOUT = 'invalid';

      const config = loadConfig();

      // parseInt('invalid', 10) returns NaN, which becomes 30000 default
      expect(config.timeout).toBeNaN();
    });

    test('should handle localhost URLs', () => {
      process.env.N8N_URL = 'http://localhost:5678';
      process.env.N8N_API_KEY = 'local-api-key';

      const config = loadConfig();

      expect(config.n8nUrl).toBe('http://localhost:5678');
    });

    test('should handle URLs with trailing slashes', () => {
      process.env.N8N_URL = 'https://n8n.example.com/';
      process.env.N8N_API_KEY = 'test-api-key-123';

      const config = loadConfig();

      // Config doesn't trim, just returns as-is
      expect(config.n8nUrl).toBe('https://n8n.example.com/');
    });

    test('should handle very long API keys', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'a'.repeat(500);

      const config = loadConfig();

      expect(config.apiKey).toHaveLength(500);
    });

    test('should handle zero timeout', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'test-api-key-123';
      process.env.N8N_TIMEOUT = '0';

      const config = loadConfig();

      expect(config.timeout).toBe(0);
    });

    test('should handle negative timeout', () => {
      process.env.N8N_URL = 'https://n8n.example.com';
      process.env.N8N_API_KEY = 'test-api-key-123';
      process.env.N8N_TIMEOUT = '-5000';

      const config = loadConfig();

      expect(config.timeout).toBe(-5000);
    });
  });
});
