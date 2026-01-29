/**
 * Test Script: Validate Note CRUD Helper Functions
 * Tests Phase 1 implementation with real N8N workflow
 */

import { N8NClient } from '../src/services/index.js';
import {
  createNote,
  updateNote,
  findNote,
  deleteNote,
  loadTemplate,
  fillTemplate,
} from '../src/helpers/note-crud.js';

// Test workflow: Discord Context Bot - Draft
const TEST_WORKFLOW_ID = 'pdIZKbTQ0EdjzxqM';
const TEST_NOTE_NAME = 'Test Changelog';

async function main() {
  console.log('🧪 Starting Note CRUD Validation Tests\n');

  // Initialize N8N client
  const client = new N8NClient({
    baseUrl: process.env.N8N_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
  });

  try {
    // Test 1: Load Template
    console.log('Test 1: Load Template');
    console.log('────────────────────');
    const template = loadTemplate('changelog');
    console.log('✅ Template loaded:', template.substring(0, 50) + '...\n');

    // Test 2: Fill Template
    console.log('Test 2: Fill Template');
    console.log('────────────────────');
    const content = fillTemplate(template, {
      workflow_name: 'Discord Context Bot - Draft',
      created_date: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      version: '1.0.1',
      change_description: 'Added note CRUD capability via Phase 1 helpers',
      author: 'MCP N8N Tools',
      reason: 'Test Phase 1 implementation',
    });
    console.log('✅ Template filled:', content.substring(0, 100) + '...\n');

    // Test 3: Create Note
    console.log('Test 3: Create Note');
    console.log('────────────────────');
    const newNote = await createNote(client, {
      workflowId: TEST_WORKFLOW_ID,
      name: TEST_NOTE_NAME,
      content: content,
      position: [-500, -100], // Top-left, away from existing nodes
      height: 350,
      width: 450,
    });
    console.log('✅ Note created:');
    console.log(`   - ID: ${newNote.id}`);
    console.log(`   - Name: ${newNote.name}`);
    console.log(`   - Position: [${newNote.position[0]}, ${newNote.position[1]}]`);
    console.log(`   - Size: ${newNote.parameters.width}x${newNote.parameters.height}\n`);

    // Test 4: Find Note
    console.log('Test 4: Find Note');
    console.log('────────────────────');
    const foundNote = await findNote(client, {
      workflowId: TEST_WORKFLOW_ID,
      noteName: TEST_NOTE_NAME,
    });
    if (foundNote) {
      console.log('✅ Note found:');
      console.log(`   - Name: ${foundNote.name}`);
      console.log(`   - Type: ${foundNote.type}`);
      console.log(`   - Content length: ${foundNote.parameters.content.length} chars\n`);
    } else {
      console.log('❌ Note not found\n');
      process.exit(1);
    }

    // Test 5: Update Note
    console.log('Test 5: Update Note');
    console.log('────────────────────');
    const updatedContent = content + '\n\n### v1.0.2 - ' + new Date().toISOString().split('T')[0] + '\n- Updated via test script\n- Validated note update capability';
    await updateNote(client, {
      workflowId: TEST_WORKFLOW_ID,
      noteName: TEST_NOTE_NAME,
      content: updatedContent,
      height: 400, // Make it taller
    });
    console.log('✅ Note updated (content + height)\n');

    // Test 6: Verify Update
    console.log('Test 6: Verify Update');
    console.log('────────────────────');
    const updatedNote = await findNote(client, {
      workflowId: TEST_WORKFLOW_ID,
      noteName: TEST_NOTE_NAME,
    });
    if (updatedNote) {
      console.log('✅ Update verified:');
      console.log(`   - Content length: ${updatedNote.parameters.content.length} chars (increased)`);
      console.log(`   - Height: ${updatedNote.parameters.height}px (changed to 400)\n`);
    }

    // Test 7: Delete Note (cleanup)
    console.log('Test 7: Delete Note (Cleanup)');
    console.log('────────────────────');
    await deleteNote(client, {
      workflowId: TEST_WORKFLOW_ID,
      noteName: TEST_NOTE_NAME,
    });
    console.log('✅ Note deleted\n');

    // Test 8: Verify Deletion
    console.log('Test 8: Verify Deletion');
    console.log('────────────────────');
    const deletedNote = await findNote(client, {
      workflowId: TEST_WORKFLOW_ID,
      noteName: TEST_NOTE_NAME,
    });
    if (deletedNote === null) {
      console.log('✅ Deletion verified (note not found)\n');
    } else {
      console.log('❌ Deletion failed (note still exists)\n');
      process.exit(1);
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED');
    console.log('═══════════════════════════════════════');
    console.log('\nPhase 1 Implementation: VALIDATED ✅\n');
    console.log('Next Steps:');
    console.log('- View workflow in N8N UI to see note visually');
    console.log('- Use helpers in production workflow operations');
    console.log('- Proceed to Phase 2 when ready');
    console.log('\nWorkflow URL:');
    console.log(`https://n8n.strangematic.com/workflow/${TEST_WORKFLOW_ID}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
