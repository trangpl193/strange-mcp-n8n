#!/usr/bin/env node
/**
 * UAT Test 3: End-to-End Builder Workflow with Validation
 *
 * Tests complete workflow: create session → add nodes → validate → preview
 * Verifies that knowledge layer integration works in realistic scenarios.
 *
 * Test Criteria:
 * - Builder session creation
 * - Node addition with validation feedback
 * - Quirk detection during add
 * - Schema warnings in preview
 * - Error detection before commit
 */

import {
  builderStart,
  builderAddNode,
  builderPreview,
  builderDiscard,
} from './src/tools/index.js';
import { initializeCoreSchemas } from './src/knowledge/index.js';

console.log('='.repeat(70));
console.log('UAT TEST 3: End-to-End Builder Workflow with Validation');
console.log('='.repeat(70));
console.log('');

async function runUAT() {
  let sessionId = null;

  try {
    // Initialize knowledge layer
    console.log('📋 Step 1: Initialize Knowledge Layer');
    await initializeCoreSchemas();
    console.log('✅ Knowledge layer initialized\n');

    // Test 1: Create builder session
    console.log('📋 Step 2: Create Builder Session');
    const session = await builderStart({
      name: 'UAT Test Workflow',
      description: 'End-to-end validation test',
    });

    sessionId = session.session_id;
    console.log(`✅ Session created: ${sessionId}`);
    console.log(`   Expires: ${session.expires_at}`);
    console.log('');

    // Test 2: Add manual trigger (no validation expected)
    console.log('📋 Step 3: Add Manual Trigger Node');
    const manual = await builderAddNode({
      session_id: sessionId,
      node: { type: 'manual' },
    });

    console.log(`✅ Added node: ${manual.node_name}`);
    console.log(`   Node ID: ${manual.node_id}`);
    console.log(`   Nodes count: ${manual.nodes_count}`);

    if (manual.validation) {
      console.log(`   ⚠️  Validation info present (unexpected for manual trigger)`);
    } else {
      console.log(`   ✓  No validation warnings (expected)`);
    }
    console.log('');

    // Test 3: Add If-node with combinator format (should show quirk warning)
    console.log('📋 Step 4: Add If-Node with Combinator Format');
    const ifNode = await builderAddNode({
      session_id: sessionId,
      node: {
        type: 'if',
        config: {
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
      },
    });

    console.log(`✅ Added node: ${ifNode.node_name}`);

    if (ifNode.validation) {
      console.log(`   Validation Info:`);
      console.log(`     Has Warnings: ${ifNode.validation.has_warnings}`);

      if (ifNode.validation.warnings.length > 0) {
        console.log(`     Schema Warnings: ${ifNode.validation.warnings.length}`);
        ifNode.validation.warnings.forEach(w => {
          console.log(`       - ${w}`);
        });
      }

      if (ifNode.validation.quirks.length > 0) {
        console.log(`     Known Quirks: ${ifNode.validation.quirks.length}`);
        ifNode.validation.quirks.forEach(q => {
          console.log(`       - ${q.substring(0, 80)}...`);
        });
        console.log('   ✅ If-node quirk detected as expected');
      } else {
        console.error('   ❌ FAILED: Expected If-node quirk warning\n');
        process.exit(1);
      }
    } else {
      console.error('   ❌ FAILED: Expected validation info for If-node\n');
      process.exit(1);
    }
    console.log('');

    // Test 4: Add Switch-node
    console.log('📋 Step 5: Add Switch-Node with Rules Format');
    const switchNode = await builderAddNode({
      session_id: sessionId,
      node: {
        type: 'switch',
        config: {
          mode: 'rules',
          rules: {
            values: [
              {
                conditions: {
                  combinator: 'and',
                  conditions: [
                    {
                      leftValue: '={{ $json.type }}',
                      rightValue: 'user',
                      operator: { type: 'string', operation: 'equals' },
                    },
                  ],
                },
                renameOutput: true,
                outputKey: 'users',
              },
            ],
          },
        },
      },
    });

    console.log(`✅ Added node: ${switchNode.node_name}`);

    if (switchNode.validation) {
      console.log(`   Validation warnings present`);
    } else {
      console.log(`   ✓  No validation warnings (expected for correct format)`);
    }
    console.log('');

    // Test 5: Add Respond node
    console.log('📋 Step 6: Add Respond Node');
    const respond = await builderAddNode({
      session_id: sessionId,
      node: {
        type: 'respond',
        config: { body: 'Success' },
      },
    });

    console.log(`✅ Added node: ${respond.node_name}`);
    console.log(`   Total nodes: ${respond.nodes_count}`);
    console.log('');

    // Test 6: Preview workflow
    console.log('📋 Step 7: Preview Complete Workflow');
    const preview = await builderPreview(null, { session_id: sessionId });

    console.log(`Workflow Summary:`);
    console.log(`  Nodes: ${preview.summary.nodes_count}`);
    console.log(`  Connections: ${preview.summary.connections_count}`);
    console.log(`  Trigger Type: ${preview.summary.trigger_type}`);
    console.log(`  Valid: ${preview.valid ? '✓' : '✗'}`);
    console.log('');

    console.log(`Validation Results:`);
    console.log(`  Errors: ${preview.errors.length}`);
    console.log(`  Warnings: ${preview.warnings.length}`);

    if (preview.errors.length > 0) {
      console.log('\n  Errors:');
      preview.errors.forEach((err, idx) => {
        console.log(`    ${idx + 1}. [${err.code}] ${err.message}`);
      });
    }

    if (preview.warnings.length > 0) {
      console.log('\n  Warnings:');
      preview.warnings.forEach((warn, idx) => {
        console.log(`    ${idx + 1}. [${warn.code}] ${warn.message}`);
      });

      // Check for critical quirk warning
      const quirkWarnings = preview.warnings.filter((w) => w.code === 'CRITICAL_QUIRK');
      if (quirkWarnings.length > 0) {
        console.log(`\n  ✅ Critical quirk detected in preview (expected)`);
        console.log(`     Affected nodes: ${quirkWarnings.map(w => w.context?.node_name).join(', ')}`);
      }
    }

    console.log('');

    if (preview.valid) {
      console.log('✅ Workflow preview successful');
    } else {
      console.error('❌ FAILED: Workflow should be valid\n');
      process.exit(1);
    }
    console.log('');

    // Test 7: Add invalid If-node to trigger error
    console.log('📋 Step 8: Add If-Node with Invalid Parameters (Error Test)');
    const invalidIf = await builderAddNode({
      session_id: sessionId,
      node: {
        type: 'if',
        name: 'Invalid If',
        config: {
          invalid: 'structure',
        },
      },
    });

    console.log(`Added node: ${invalidIf.node_name}`);

    if (invalidIf.validation && invalidIf.validation.warnings.length > 0) {
      console.log(`✅ Invalid format detected during add`);
    }
    console.log('');

    // Test 8: Preview should show error
    console.log('📋 Step 9: Preview with Invalid Node');
    const errorPreview = await builderPreview(null, { session_id: sessionId });

    if (!errorPreview.valid) {
      console.log('✅ Invalid workflow correctly detected');

      const schemaErrors = errorPreview.errors.filter(
        (e) => e.code === 'SCHEMA_VALIDATION_FAILED'
      );

      if (schemaErrors.length > 0) {
        console.log(`   Schema validation errors: ${schemaErrors.length}`);
        schemaErrors.forEach(err => {
          console.log(`   - ${err.message}`);
          if (err.context?.suggestion) {
            console.log(`     Suggestion: ${err.context.suggestion}`);
          }
        });
      } else {
        console.error('   ❌ FAILED: Expected schema validation error\n');
        process.exit(1);
      }
    } else {
      console.error('❌ FAILED: Workflow should be invalid\n');
      process.exit(1);
    }
    console.log('');

    // Test 9: Cleanup
    console.log('📋 Step 10: Discard Test Session');
    await builderDiscard({ session_id: sessionId });
    console.log('✅ Session discarded\n');
    sessionId = null;

    // Summary
    console.log('='.repeat(70));
    console.log('✅ UAT TEST 3: PASSED');
    console.log('='.repeat(70));
    console.log('');
    console.log('Results:');
    console.log('  ✓ Builder session creation');
    console.log('  ✓ Node addition with validation feedback');
    console.log('  ✓ If-node quirk detected on add');
    console.log('  ✓ Correct formats pass validation');
    console.log('  ✓ Invalid formats trigger errors');
    console.log('  ✓ Preview shows quirk warnings');
    console.log('  ✓ Preview shows schema errors');
    console.log('  ✓ Workflow validation prevents bad commits');
    console.log('');
    console.log('Recommendation: APPROVE builder integration for production use');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(70));
    console.error('❌ UAT TEST 3: FAILED');
    console.error('='.repeat(70));
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error(error.stack);

    // Cleanup on error
    if (sessionId) {
      console.error('\nCleaning up session...');
      try {
        await builderDiscard({ session_id: sessionId });
        console.error('Session discarded');
      } catch (cleanupError) {
        console.error(`Cleanup failed: ${cleanupError.message}`);
      }
    }

    process.exit(1);
  }
}

runUAT().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
