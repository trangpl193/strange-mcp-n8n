#!/usr/bin/env node
import { N8NClient } from './src/services/n8n-client.ts';

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_URL || !N8N_API_KEY) {
  console.error('❌ Missing N8N_URL or N8N_API_KEY environment variables');
  process.exit(1);
}

console.log('🧪 Testing N8N MCP Server - Phase 1\n');
console.log(`N8N URL: ${N8N_URL}\n`);

const client = new N8NClient({
  baseUrl: N8N_URL,
  apiKey: N8N_API_KEY,
  timeout: 30000,
});

// Test 1: List workflows
console.log('📋 Test 1: List workflows');
try {
  const result = await client.listWorkflows({ limit: 5 });
  console.log(`✅ Success: Found ${result.data.length} workflows`);
  if (result.data.length > 0) {
    console.log(`   First workflow: "${result.data[0].name}" (${result.data[0].id})`);
  }
  console.log(`   Has more: ${!!result.nextCursor}`);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

console.log('');

// Test 2: List credentials
console.log('🔑 Test 2: List credentials');
try {
  const result = await client.listCredentials();
  console.log(`✅ Success: Found ${result.length} credentials`);
  if (result.length > 0) {
    const types = [...new Set(result.map(c => c.type))];
    console.log(`   Types: ${types.join(', ')}`);
  }
} catch (error) {
  console.error('❌ Failed:', error.message);
}

console.log('\n✨ Phase 1 testing complete');
