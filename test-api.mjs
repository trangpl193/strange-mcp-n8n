#!/usr/bin/env node

// Simple test using fetch directly
const N8N_URL = "https://n8n.strangematic.com";
const N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNmJkOTA2Yy1jMzhmLTQ5N2UtYWEwYy0zNjE5OGE2ZDI2ZjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4ODA3NzI4fQ.CaG50Lh4WVyMkiVovhvgqBxXn1vQ_fEn-MfZNTpinUo";

console.log('🧪 Testing N8N API directly\n');

// Test workflows
console.log('📋 Test: GET /api/v1/workflows');
try {
  const response = await fetch(`${N8N_URL}/api/v1/workflows?limit=5`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  console.log(`✅ Status: ${response.status}`);
  console.log(`   Response: ${JSON.stringify(data)}`);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

console.log('');

// Test credentials (expect 405)
console.log('🔑 Test: GET /api/v1/credentials');
try {
  const response = await fetch(`${N8N_URL}/api/v1/credentials`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  console.log(`❌ Status: ${response.status} (expected - endpoint not supported)`);
  console.log(`   Response: ${JSON.stringify(data)}`);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

console.log('\n✨ Testing complete');
console.log('\n📝 Note: Credentials endpoint does not support GET in N8N public API');
console.log('   This is a known limitation. Tool needs to be updated or removed.');
