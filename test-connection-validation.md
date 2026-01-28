# Connection Validation Test Scenarios

## Implementation Summary

Modified `/home/strange/projects/strange-mcp-n8n/src/tools/builder-connect.ts` to implement P0-1 Phase 2 + P0-3 connection validation with rich error messages.

### Changes Made

1. **Output Index Validation** (lines 60-136)
   - Extracts `expected_outputs` from node metadata
   - Validates `from_output` index against expected outputs
   - Throws rich error with P0-3 structure when validation fails

2. **Enhanced Node Not Found Errors** (lines 47-57, 140-151)
   - Added `recovery_hint` to guide users
   - Consistent error messages for source and target nodes

3. **Updated Success Response** (lines 196-209)
   - Added `from_output` and `to_input` to connection object
   - Added `validation` object indicating validation passed

4. **Updated Type Definitions** (`builder-types.ts` lines 122-135)
   - Extended `BuilderConnectOutput` interface with new fields

## Test Scenarios

### Scenario 1: Valid Connection
```typescript
// Switch node with 4 rules (expected_outputs: 4)
builder_connect({
  session_id: "abc123",
  from_node: "Switch",
  to_node: "Action1",
  from_output: 2  // Valid: 0-3
})
```

**Expected Result:**
```json
{
  "success": true,
  "connection": {
    "from": "Switch",
    "to": "Action1",
    "from_output": 2,
    "to_input": 0
  },
  "connections_count": 1,
  "validation": {
    "output_index_valid": true,
    "validated_against_metadata": true
  }
}
```

### Scenario 2: Invalid Output Index (Switch Node)
```typescript
// Switch node with 4 rules (expected_outputs: 4)
builder_connect({
  session_id: "abc123",
  from_node: "Switch",
  to_node: "Action1",
  from_output: 4  // Invalid: exceeds expected_outputs
})
```

**Expected Error:**
```json
{
  "error": "Connection failed: Node 'Switch' only has 4 output(s)",
  "details": {
    // WHO
    "node_name": "Switch",
    "node_type": "n8n-nodes-base.switch",
    "node_id": "uuid-123",
    "node_category": "branching",

    // WHAT
    "error": "Output index 4 exceeds expected outputs",
    "requested_output": 4,
    "expected_outputs": 4,
    "valid_range": "0 to 3",

    // WHY
    "rules_count": 4,
    "explanation": "Switch node with 4 rules has 4 outputs (typeVersion 3.4: outputs = rules count, no separate fallback output)",

    // HOW TO FIX
    "fix": {
      "action": "Change from_output parameter in builder_connect call",
      "parameter": "from_output",
      "current_value": 4,
      "suggested_value": 3,
      "example": "builder_connect({ sessionId: 'abc123', fromNode: 'Switch', toNode: 'Action1', from_output: 3 })"
    },

    // CONTEXT
    "existing_connections": [
      {
        "to_node": "Action2",
        "from_output": 0,
        "valid": true,
        "status": "✅"
      }
    ],

    // REFERENCE
    "reference": "See ~/.claude/skills/x--infra--n8n-workflow/references/node-quirks.yaml for branching node formats"
  }
}
```

### Scenario 3: Invalid Output Index (If Node)
```typescript
// If node (expected_outputs: 2)
builder_connect({
  session_id: "abc123",
  from_node: "If",
  to_node: "Action1",
  from_output: 2  // Invalid: If nodes only have outputs 0 and 1
})
```

**Expected Error:**
```json
{
  "error": "Connection failed: Node 'If' only has 2 output(s)",
  "details": {
    "node_name": "If",
    "node_type": "n8n-nodes-base.if",
    "requested_output": 2,
    "expected_outputs": 2,
    "valid_range": "0 to 1",
    "explanation": "If nodes always have exactly 2 outputs: [0] = true branch, [1] = false branch",
    "fix": {
      "action": "Change from_output parameter in builder_connect call",
      "parameter": "from_output",
      "current_value": 2,
      "suggested_value": 1,
      "example": "builder_connect({ sessionId: 'abc123', fromNode: 'If', toNode: 'Action1', from_output: 1 })"
    },
    "reference": "See ~/.claude/skills/x--infra--n8n-workflow/references/node-quirks.yaml for branching node formats"
  }
}
```

### Scenario 4: Node Not Found
```typescript
builder_connect({
  session_id: "abc123",
  from_node: "NonExistent",
  to_node: "Action1",
  from_output: 0
})
```

**Expected Error:**
```json
{
  "error": "Source node 'NonExistent' not found in workflow",
  "details": {
    "available_nodes": ["Switch", "If", "Action1", "Action2"],
    "recovery_hint": "Check node name or use builder_preview to see current nodes"
  }
}
```

## Key Features

### 1. Eager Validation
- Validates output index BEFORE creating connection
- Prevents invalid connections from being stored
- Uses metadata.expected_outputs as source of truth

### 2. Rich Error Context (P0-3)
- **WHO**: Identifies the problematic node with full context
- **WHAT**: Clearly states what went wrong with exact values
- **WHY**: Explains node-specific behavior (Switch vs If vs other)
- **HOW**: Provides executable fix with suggested value
- **CONTEXT**: Shows existing connections for comparison
- **REFERENCE**: Points to documentation for complex cases

### 3. Node-Specific Explanations
- **Switch nodes**: Explains typeVersion 3.4 behavior (outputs = rules count)
- **If nodes**: Explains true/false branch structure
- **Other nodes**: Generic explanation based on expected_outputs

### 4. Actionable Error Messages
- Includes exact parameter to change
- Shows current vs suggested value
- Provides copy-paste example with correct syntax

### 5. Connection Context
- Lists existing connections from the same node
- Shows which connections are valid/invalid with status emoji
- Helps users understand current workflow structure

## Implementation Notes

### Metadata Dependency
- Requires `metadata.expected_outputs` to be set during node creation
- Falls back to 1 if metadata is missing (safe default)
- Works with parallel implementation in `builder-add-node.ts`

### Type Safety
- Updated `BuilderConnectOutput` interface to include new fields
- Ensures compile-time safety for validation object
- Maintains backward compatibility with connection object structure

### Error Code
- Uses `McpErrorCode.INVALID_PARAMS` for validation failures
- Consistent with existing error handling in the codebase
- Allows MCP clients to handle validation errors appropriately
