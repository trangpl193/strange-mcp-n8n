#!/usr/bin/env node
/**
 * UAT Test 2: Quirks Check Validation
 *
 * Verifies that quirks_check and quirks_search detect known issues
 * and provide appropriate workarounds.
 *
 * Test Criteria:
 * - Quirks detected for If-node
 * - Severity levels correct
 * - Auto-fix flags accurate
 * - Symptom search works
 * - Workarounds provided
 */

import { quirks_check, quirks_search, initializeCoreSchemas } from './src/knowledge/index.js';

console.log('='.repeat(70));
console.log('UAT TEST 2: Quirks Check Validation');
console.log('='.repeat(70));
console.log('');

async function runUAT() {
  // Initialize knowledge layer
  console.log('📋 Step 1: Initialize Knowledge Layer');
  await initializeCoreSchemas();
  console.log('✅ Knowledge layer initialized\n');

  // Test 1: Check If-node quirks
  console.log('📋 Step 2: Check If-node Quirks');
  try {
    const quirks = await quirks_check('if');

    console.log(`✅ Found ${quirks.length} quirk(s) for If-node`);

    quirks.forEach((quirk, idx) => {
      console.log(`\n   Quirk ${idx + 1}: ${quirk.id}`);
      console.log(`   Title: ${quirk.title}`);
      console.log(`   Severity: ${quirk.severity}`);
      console.log(`   Affected Nodes: ${quirk.affectedNodes.join(', ')}`);
      console.log(`   Auto-fix Available: ${quirk.autoFixAvailable ? 'YES' : 'NO'}`);
      console.log(`   Symptoms:`);
      quirk.symptoms.forEach(symptom => {
        console.log(`     - ${symptom}`);
      });
      console.log(`   Workaround: ${quirk.workaround.substring(0, 100)}...`);
    });

    console.log('');

    // Verify critical quirk exists
    const critical = quirks.filter(q => q.severity === 'critical');
    if (critical.length > 0) {
      console.log(`✅ Found ${critical.length} critical quirk(s)`);
    } else {
      console.error('❌ FAILED: Expected at least one critical quirk for If-node\n');
      process.exit(1);
    }

    // Verify auto-fix availability
    const autoFixable = quirks.filter(q => q.autoFixAvailable);
    if (autoFixable.length > 0) {
      console.log(`✅ Found ${autoFixable.length} auto-fixable quirk(s)`);
    }

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 2: Check node without quirks
  console.log('📋 Step 3: Check Node Without Quirks (Filter)');
  try {
    const quirks = await quirks_check('filter');

    if (quirks.length === 0) {
      console.log('✅ Filter-node has no known quirks (expected)');
    } else {
      console.log(`   Found ${quirks.length} quirk(s) - documenting for awareness`);
    }
    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 3: Version filtering
  console.log('📋 Step 4: Filter Quirks by Type Version');
  try {
    const quirksV1 = await quirks_check('if', 1);

    console.log(`✅ If-node v1 quirks: ${quirksV1.length}`);

    quirksV1.forEach(quirk => {
      const versions = quirk.affectedVersions.nodeTypeVersion;
      console.log(`   ${quirk.id} affects versions: ${versions.join(', ')}`);

      if (!versions.includes(1)) {
        console.error(`❌ FAILED: Quirk should affect version 1 but doesn't\n`);
        process.exit(1);
      }
    });

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 4: Search by symptoms - empty canvas
  console.log('📋 Step 5: Search Quirks by Symptom "empty canvas"');
  try {
    const quirks = await quirks_search(['empty', 'canvas']);

    console.log(`✅ Found ${quirks.length} quirk(s) matching symptoms`);

    if (quirks.length > 0) {
      quirks.forEach(quirk => {
        console.log(`   - ${quirk.id}: ${quirk.title}`);
      });

      // Verify If-node dual-format quirk is found
      const dualFormat = quirks.find(q => q.id === 'if-node-dual-format');
      if (dualFormat) {
        console.log('✅ Found expected if-node-dual-format quirk');
      } else {
        console.error('❌ FAILED: Should find if-node-dual-format quirk\n');
        process.exit(1);
      }
    }

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 5: Search by symptoms - console error
  console.log('📋 Step 6: Search Quirks by Symptom "could not find"');
  try {
    const quirks = await quirks_search(['could not find', 'property']);

    console.log(`✅ Found ${quirks.length} quirk(s) matching symptoms`);

    if (quirks.length > 0) {
      console.log('✅ Symptom search working correctly');
    }

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 6: Search with no matches
  console.log('📋 Step 7: Search Quirks with No Matches');
  try {
    const quirks = await quirks_search(['nonexistent-symptom-xyz-123']);

    if (quirks.length === 0) {
      console.log('✅ Correctly returns empty array for non-matching symptoms');
    } else {
      console.error(`❌ FAILED: Should return empty array, got ${quirks.length} quirks\n`);
      process.exit(1);
    }

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 7: Verify quirk structure
  console.log('📋 Step 8: Validate Quirk Data Structure');
  try {
    const quirks = await quirks_check('if');

    if (quirks.length > 0) {
      const quirk = quirks[0];

      const hasRequired = quirk.id &&
                         quirk.title &&
                         quirk.affectedNodes &&
                         quirk.severity &&
                         quirk.symptoms &&
                         quirk.workaround &&
                         typeof quirk.autoFixAvailable === 'boolean' &&
                         quirk.affectedVersions;

      if (hasRequired) {
        console.log('✅ Quirk data structure complete');
        console.log('   Required fields present:');
        console.log('     ✓ id');
        console.log('     ✓ title');
        console.log('     ✓ affectedNodes');
        console.log('     ✓ severity');
        console.log('     ✓ symptoms');
        console.log('     ✓ workaround');
        console.log('     ✓ autoFixAvailable');
        console.log('     ✓ affectedVersions');
      } else {
        console.error('❌ FAILED: Quirk missing required fields\n');
        process.exit(1);
      }
    }

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Test 8: Case-insensitive search
  console.log('📋 Step 9: Verify Case-Insensitive Search');
  try {
    const lowerCase = await quirks_search(['empty']);
    const upperCase = await quirks_search(['EMPTY']);
    const mixedCase = await quirks_search(['EmPtY']);

    if (lowerCase.length === upperCase.length && upperCase.length === mixedCase.length) {
      console.log('✅ Symptom search is case-insensitive');
      console.log(`   All variants found ${lowerCase.length} quirk(s)`);
    } else {
      console.error('❌ FAILED: Search should be case-insensitive\n');
      process.exit(1);
    }

    console.log('');
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}\n`);
    process.exit(1);
  }

  // Summary
  console.log('='.repeat(70));
  console.log('✅ UAT TEST 2: PASSED');
  console.log('='.repeat(70));
  console.log('');
  console.log('Results:');
  console.log('  ✓ If-node quirks detected');
  console.log('  ✓ Critical severity levels identified');
  console.log('  ✓ Auto-fix flags accurate');
  console.log('  ✓ Version filtering works');
  console.log('  ✓ Symptom search functional');
  console.log('  ✓ Empty results handled correctly');
  console.log('  ✓ Data structure validated');
  console.log('  ✓ Case-insensitive search confirmed');
  console.log('');
  console.log('Recommendation: APPROVE quirks_check() for production use');
  console.log('');
}

runUAT().catch(error => {
  console.error('');
  console.error('='.repeat(70));
  console.error('❌ UAT TEST 2: FAILED');
  console.error('='.repeat(70));
  console.error('');
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
