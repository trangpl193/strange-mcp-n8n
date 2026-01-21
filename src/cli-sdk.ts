#!/usr/bin/env node

/**
 * CLI entry point for MCP N8N Server (SDK version)
 *
 * Uses official @modelcontextprotocol/sdk for Streamable HTTP transport.
 * Compatible with Claude Code CLI 2.1.7+
 *
 * Created: 2026-01-20
 */

import { startServer } from './server-sdk.js';

// Load configuration from environment
const config = {
  n8nUrl: process.env.N8N_URL || '',
  apiKey: process.env.N8N_API_KEY || '',
  mcpApiKey: process.env.MCP_API_KEY || '',
  timeout: parseInt(process.env.N8N_TIMEOUT || '30000', 10),
  httpPort: parseInt(process.env.MCP_PORT || '3302', 10),
  httpHost: process.env.MCP_HOST || '0.0.0.0',
};

// Validate required configuration
const required = ['n8nUrl', 'apiKey', 'mcpApiKey'];
const missing = required.filter((key) => !config[key as keyof typeof config]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((key) => {
    const envKey =
      key === 'n8nUrl'
        ? 'N8N_URL'
        : key === 'apiKey'
          ? 'N8N_API_KEY'
          : key === 'mcpApiKey'
            ? 'MCP_API_KEY'
            : key;
    console.error(`  - ${envKey}`);
  });
  console.error('\nUsage:');
  console.error(
    '  N8N_URL=https://n8n.example.com N8N_API_KEY=key MCP_API_KEY=key node cli-sdk.js'
  );
  process.exit(1);
}

// Start server
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  MCP N8N Server');
console.log('  Transport: Streamable HTTP (Official SDK)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

startServer(config).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
