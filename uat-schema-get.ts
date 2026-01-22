#!/usr/bin/env node
/**
 * UAT Test 1: Schema Get Validation
 *
 * Verifies that schema_get retrieves correct schema information
 * for If, Switch, and Filter nodes.
 *
 * Test Criteria:
 * - Schema retrieval works for all 3 node types
 * - Recommended formats are identified
 * - Metadata is present and valid
 * - Error handling for unknown types
 */

import { schema_get, schema_list, initializeCoreSchemas } from './src/knowledge/index.js';

console.log('='.repeat(70));
console.log('UAT TEST 1: Schema Get Validation');
console.log('='.repeat(70));
console.log('');

async function runUAT() {
  // Initialize knowledge layer
  console.log('📋 Step 1: Initialize Knowledge Layer');
  await initializeCoreSchemas();
  console.log('✅ Knowledge layer initialized\n');

  // Test 1: Retrieve If-node schema
  console.log('📋 Step 2: Retrieve If-node Schema');
  try {
    const ifSchema = await schema_get('if', 1);

    console.log(`✅ Retrieved schema for: ${ifSchema.nodeType}`);
    console.log(`   N8N Type: ${ifSchema.n8nType}`);
    console.log(`   Type Version: ${ifSchema.typeVersion}`);
    console.log(`   Formats: ${ifSchema.formats.length}`);

    ifSchema.formats.forEach((format, idx) => {
      console.log(`   ${idx + 1}. ${format.name}`);
      console.log(`      Status: ${format.status}`);
      console.log(`      UI Compatible: ${format.uiCompatible ? '✓' : '✗'}`);
      console.log(`      API Compatible: ${format.apiCompatible ? '✓' : '✗'}`);
    });

    const recommended = ifSchema.formats.find(f => f.status === 'recommended');
    console.log(`   Recommended Format: ${recommended?.name || 'NONE'}`);
    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 2: Retrieve Switch-node schema
  console.log('📋 Step 3: Retrieve Switch-node Schema');
  try {
    const switchSchema = await schema_get('switch', 1);

    console.log(`✅ Retrieved schema for: ${switchSchema.nodeType}`);
    console.log(`   Formats: ${switchSchema.formats.map(f => f.name).join(', ')}`);
    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 3: Retrieve Filter-node schema
  console.log('📋 Step 4: Retrieve Filter-node Schema');
  try {
    const filterSchema = await schema_get('filter', 2);

    console.log(`✅ Retrieved schema for: ${filterSchema.nodeType}`);
    console.log(`   Type Version: ${filterSchema.typeVersion}`);
    console.log(`   Formats: ${filterSchema.formats.map(f => f.name).join(', ')}`);
    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 4: List all schemas
  console.log('📋 Step 5: List All Schemas');
  try {
    const allSchemas = await schema_list();

    console.log(`✅ Total schemas available: ${allSchemas.length}`);
    allSchemas.forEach(schema => {
      console.log(`   - ${schema.nodeType} (v${schema.typeVersion})`);
    });
    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 5: Filter schemas by status
  console.log('📋 Step 6: Filter Schemas by Recommended Status');
  try {
    const recommended = await schema_list({ status: 'recommended' });

    console.log(`✅ Schemas with recommended formats: ${recommended.length}`);
    recommended.forEach(schema => {
      const recFormat = schema.formats.find(f => f.status === 'recommended');
      console.log(`   - ${schema.nodeType}: ${recFormat?.name || 'NONE'}`);
    });
    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 6: Error handling - unknown node type
  console.log('📋 Step 7: Error Handling - Unknown Node Type');
  try {
    await schema_get('unknown-node-type');
    console.error('❌ FAILED: Should have thrown error for unknown type\n');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('Schema not found')) {
      console.log('✅ Correctly throws error for unknown type');
      console.log(`   Error message: ${error.message.split('\n')[0]}`);
      console.log('');
    } else {
      console.error(`❌ FAILED: Unexpected error: ${error.message}\n`);
      process.exit(1);
    }
  }

  // Test 7: Metadata validation
  console.log('📋 Step 8: Validate Schema Metadata');
  try {
    const schema = await schema_get('if');

    const hasMetadata = schema.metadata &&
                       schema.metadata.source &&
                       schema.metadata.validatedBy &&
                       schema.metadata.validatedDate &&
                       schema.metadata.n8nVersion;

    if (hasMetadata) {
      console.log('✅ Schema metadata complete');
      console.log(`   Source: ${schema.metadata.source}`);
      console.log(`   Validated By: ${schema.metadata.validatedBy}`);
      console.log(`   Validated Date: ${schema.metadata.validatedDate}`);
      console.log(`   N8N Version: ${schema.metadata.n8nVersion}`);
      console.log('');
    } else {
      console.error('❌ FAILED: Schema metadata incomplete\n');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Summary
  console.log('='.repeat(70));
  console.log('✅ UAT TEST 1: PASSED');
  console.log('='.repeat(70));
  console.log('');
  console.log('Results:');
  console.log('  ✓ If-node schema retrieval');
  console.log('  ✓ Switch-node schema retrieval');
  console.log('  ✓ Filter-node schema retrieval');
  console.log('  ✓ Schema listing');
  console.log('  ✓ Schema filtering by status');
  console.log('  ✓ Error handling for unknown types');
  console.log('  ✓ Metadata validation');
  console.log('');
  console.log('Recommendation: APPROVE schema_get() for production use');
  console.log('');
}

runUAT().catch(error => {
  console.error('');
  console.error('='.repeat(70));
  console.error('❌ UAT TEST 1: FAILED');
  console.error('='.repeat(70));
  console.error('');
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
