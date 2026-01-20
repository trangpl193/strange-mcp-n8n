#!/usr/bin/env node
import { N8NMCPServer } from './server.js';

/**
 * Entry point for N8N MCP Server
 */
async function main() {
  try {
    const server = new N8NMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start N8N MCP Server:', error);
    process.exit(1);
  }
}

main();
