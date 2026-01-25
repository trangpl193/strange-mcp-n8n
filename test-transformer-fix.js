/**
 * Direct test of workflow-transformer fix
 * Tests that IF/Switch nodes create proper branching connections
 */

import { WorkflowTransformer } from './dist/index.js';

const testSimplifiedWorkflow = {
  name: "UAT Test - IF Node Branching",
  steps: [
    {
      type: "manual",
      name: "Start",
    },
    {
      type: "if",
      name: "Check Amount",
      config: {
        conditions: {
          string: [
            {
              value1: "={{ $json.amount }}",
              operation: "largerEqual",
              value2: "1000"
            }
          ]
        }
      }
    },
    {
      type: "code",
      name: "High Amount Handler",
      config: {
        code: "return items.map(item => ({ ...item, category: 'high' }));"
      }
    },
    {
      type: "code",
      name: "Low Amount Handler",
      config: {
        code: "return items.map(item => ({ ...item, category: 'low' }));"
      }
    }
  ]
};

console.log("=== Testing WorkflowTransformer Fix ===\n");

const transformer = new WorkflowTransformer();
const result = transformer.transform(testSimplifiedWorkflow);

console.log("Workflow Name:", result.name);
console.log("Total Nodes:", result.nodes.length);
console.log("\nNode Names:");
result.nodes.forEach((node, idx) => {
  console.log(`  ${idx}: ${node.name} (${node.type})`);
});

console.log("\n=== Connections Analysis ===");

const ifNode = result.nodes[1]; // "Check Amount" IF node
const ifNodeConnections = result.connections[ifNode.name];

console.log(`\nIF Node: "${ifNode.name}"`);
console.log("Connection Structure:", JSON.stringify(ifNodeConnections, null, 2));

if (ifNodeConnections && ifNodeConnections.main) {
  const outputCount = ifNodeConnections.main.length;
  console.log(`\n✓ IF node has ${outputCount} output(s)`);

  if (outputCount === 2) {
    console.log("✓ EXPECTED: 2 outputs for IF node");
    console.log(`  Output 0 (true):  ${ifNodeConnections.main[0][0]?.node || 'empty'}`);
    console.log(`  Output 1 (false): ${ifNodeConnections.main[1][0]?.node || 'empty'}`);

    // Verify they connect to the right nodes
    const output0Node = ifNodeConnections.main[0][0]?.node;
    const output1Node = ifNodeConnections.main[1][0]?.node;

    if (output0Node === "High Amount Handler" && output1Node === "Low Amount Handler") {
      console.log("\n✅ SUCCESS: IF node creates proper branching structure!");
      console.log("   True branch → High Amount Handler");
      console.log("   False branch → Low Amount Handler");
    } else {
      console.log("\n❌ FAILED: Branches don't connect to expected nodes");
      console.log(`   Expected: [High Amount Handler, Low Amount Handler]`);
      console.log(`   Got: [${output0Node}, ${output1Node}]`);
    }
  } else {
    console.log(`\n❌ FAILED: Expected 2 outputs, got ${outputCount}`);
    console.log("   This indicates linear chaining (the original bug)");
  }
} else {
  console.log("\n❌ FAILED: No connections found for IF node");
}

console.log("\n=== Test Complete ===");
