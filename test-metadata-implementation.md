# P0-1 Phase 1 Implementation Test Cases

## Implementation Summary

Successfully added `expected_outputs` metadata to DraftNode type and implemented calculation logic in builder-add-node.ts.

## Modified Files

1. `/home/strange/projects/strange-mcp-n8n/src/services/builder-types.ts`
   - Added `metadata` field to DraftNode interface (lines 49-52)

2. `/home/strange/projects/strange-mcp-n8n/src/tools/builder-add-node.ts`
   - Added `calculateExpectedOutputs()` function (lines 185-206)
   - Added `getNodeCategory()` function (lines 208-219)
   - Updated draftNode creation to include metadata (lines 92-95)

## Test Cases

### Test Case 1: Switch Node with 4 Rules
```typescript
// Input
{
  type: 'switch',
  config: {
    rules: {
      values: [
        { /* rule 1 */ },
        { /* rule 2 */ },
        { /* rule 3 */ },
        { /* rule 4 */ }
      ]
    }
  }
}

// Expected Output
metadata: {
  expected_outputs: 4,
  node_category: 'branching'
}
```

### Test Case 2: Switch Node without Rules (Default)
```typescript
// Input
{
  type: 'switch',
  config: {}
}

// Expected Output
metadata: {
  expected_outputs: 2,  // Default fallback
  node_category: 'branching'
}
```

### Test Case 3: If Node
```typescript
// Input
{
  type: 'if',
  config: { /* any conditions */ }
}

// Expected Output
metadata: {
  expected_outputs: 2,  // Always true/false
  node_category: 'branching'
}
```

### Test Case 4: Filter Node
```typescript
// Input
{
  type: 'filter',
  config: { /* any filter conditions */ }
}

// Expected Output
metadata: {
  expected_outputs: 2,  // Pass/fail
  node_category: 'branching'
}
```

### Test Case 5: PostgreSQL Node (Action)
```typescript
// Input
{
  type: 'postgres',
  action: 'query',
  config: { query: 'SELECT * FROM users' }
}

// Expected Output
metadata: {
  expected_outputs: 1,  // Default single output
  node_category: 'action'
}
```

### Test Case 6: Webhook Node (Trigger)
```typescript
// Input
{
  type: 'webhook',
  config: { path: '/my-hook' }
}

// Expected Output
metadata: {
  expected_outputs: 1,  // Default single output
  node_category: 'trigger'
}
```

### Test Case 7: Schedule Node (Trigger)
```typescript
// Input
{
  type: 'schedule',
  config: { /* schedule config */ }
}

// Expected Output
metadata: {
  expected_outputs: 1,  // Default single output
  node_category: 'trigger'
}
```

## Implementation Details

### calculateExpectedOutputs()
- **Switch nodes**: Returns count of rules from `parameters.rules.values.length`
  - Falls back to 2 if no rules are defined
- **If nodes**: Always returns 2 (true/false outputs)
- **Filter nodes**: Always returns 2 (pass/fail outputs)
- **All other nodes**: Returns 1 (default single output)

### getNodeCategory()
- **Triggers**: webhook, schedule, manual
- **Branching**: switch, if, filter
- **Actions**: All other node types (default)

### Type Normalization
Both functions handle type variations by stripping the `n8n-nodes-base.` prefix:
```typescript
const baseType = nodeType.replace('n8n-nodes-base.', '');
```

This ensures the logic works whether the simplified type ('switch') or full N8N type ('n8n-nodes-base.switch') is used.

## Next Steps

This implementation sets the foundation for:
- P0-2: Connection validation based on expected_outputs
- Future analytics on workflow structure
- Enhanced debugging tools
