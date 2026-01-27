# Switch Node Format Requirements

## Problem Summary

**AI agents using MCP builder tools create Switch nodes with typeVersion 1 format that is BROKEN in n8n UI.**

The root cause: typeVersion 1 uses outdated parameter structure that n8n UI cannot render correctly.

## Format Comparison

### ❌ BROKEN: typeVersion 1 (Expression Mode)

**Source**: Legacy format from old n8n versions

```json
{
  "parameters": {
    "mode": "expression",
    "output": "multipleOutputs"  // ← PROBLEM: No routing logic
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 1,
  "id": "node-f85ab5ff",
  "name": "Route-By-Status",
  "position": [288, 208]
}
```

**Issues**:
- `output: "multipleOutputs"` parameter provides no routing logic
- n8n UI cannot interpret this format
- Workflow appears broken in UI (no visible routing configuration)
- Executions fail silently or route incorrectly

---

### ✅ WORKING: typeVersion 3.4 (Rules Mode)

**Source**: Current n8n UI default for condition-based routing

```json
{
  "parameters": {
    "rules": {
      "values": [
        {
          "conditions": {
            "options": {
              "caseSensitive": true,
              "leftValue": "",
              "typeValidation": "strict",
              "version": 3
            },
            "conditions": [
              {
                "leftValue": "={{ $json.priority }}",
                "rightValue": "high",
                "operator": {
                  "type": "string",
                  "operation": "equals"
                },
                "id": "08c66219-703c-4ed8-bc8f-0dfb21c2da40"  // ← Required
              }
            ],
            "combinator": "and"
          }
        },
        {
          "conditions": {
            "options": {
              "caseSensitive": true,
              "leftValue": "",
              "typeValidation": "strict",
              "version": 3
            },
            "conditions": [
              {
                "id": "563e57a9-418b-45b6-9a51-8c891156a191",  // ← Required
                "leftValue": "={{ $json.priority }}",
                "rightValue": "low",
                "operator": {
                  "type": "string",
                  "operation": "equals",
                  "name": "filter.operator.equals"
                }
              }
            ],
            "combinator": "and"
          }
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.4,
  "id": "72ff14b1-cbb5-48d9-9d7e-faf680b94a2e",
  "name": "Switch",
  "position": [288, 80]
}
```

**Key Requirements**:
1. `rules.values[]` array with one object per output route
2. Each rule has `conditions` object with:
   - `options`: validation settings
   - `conditions[]`: array of individual conditions
   - `combinator`: "and" or "or"
3. **Each condition MUST have unique `id` field** (UUID format)
4. Operators use structured format: `{type, operation, name?}`

---

### ✅ WORKING: typeVersion 3.4 (Expression Mode)

**Source**: Current n8n UI for JavaScript expression-based routing

```json
{
  "parameters": {
    "mode": "expression",
    "numberOutputs": 2  // ← Correct parameter for v3.4
  },
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.4,
  "id": "64c46366-5859-49da-9d1a-197020dff0cf",
  "name": "Switch1",
  "position": [288, 624]
}
```

**Key Differences from v1**:
- Uses `numberOutputs` (integer) instead of `output: "multipleOutputs"`
- Requires typeVersion 3.4 (NOT 1)
- Expression logic evaluated at runtime by n8n engine

---

## Root Cause Analysis

### Why Builder Creates Broken Nodes

1. **Default typeVersion**: MCP builder/transformer likely defaults to typeVersion 1
2. **Outdated Schema**: Schema knowledge may reference old n8n documentation
3. **Missing Validation**: No validation catches incompatible typeVersion + parameter combinations

### Evidence from Testing

| Workflow | Node Type | typeVersion | Parameters | Status |
|----------|-----------|-------------|------------|--------|
| euW7tBP1ddy1W2Zo (Priority-Router) | Switch | 1 | `mode: "expression", output: null` | ❌ Broken |
| euW7tBP1ddy1W2Zo (Switch) | Switch | 3.4 | `rules.values[]` with IDs | ✅ Works |
| euW7tBP1ddy1W2Zo (Switch1) | Switch | 3.4 | `mode: "expression", numberOutputs: 2` | ✅ Works |

---

## Solution: MCP Tool Requirements

### 1. Always Use typeVersion 3.4

**transformer code should enforce**:
```typescript
{
  type: "n8n-nodes-base.switch",
  typeVersion: 3.4,  // ← NEVER use 1
  // ...
}
```

### 2. Rules Mode Format (Recommended)

**For condition-based routing**, use this structure:

```typescript
parameters: {
  rules: {
    values: [
      {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 3
          },
          conditions: [
            {
              id: uuidv4(),  // ← Generate unique UUID
              leftValue: "={{ $json.fieldName }}",
              rightValue: "expectedValue",
              operator: {
                type: "string",  // or "number", "boolean", "dateTime"
                operation: "equals"  // or other operations
              }
            }
          ],
          combinator: "and"
        }
      }
      // Add more rules for additional outputs
    ]
  },
  options: {}
}
```

**Available operator types**:
- `string`: equals, notEquals, contains, notContains, startsWith, endsWith, regex
- `number`: equals, notEquals, gt, gte, lt, lte
- `boolean`: equals, notEquals
- `dateTime`: after, before

### 3. Expression Mode Format (Advanced)

**For JavaScript expression routing**:

```typescript
parameters: {
  mode: "expression",
  numberOutputs: 2  // ← Number of output branches
}
```

Then users configure expressions in n8n UI.

---

## Migration Guide

### For Existing Workflows with typeVersion 1

1. **Detection**: Check if any Switch nodes have `typeVersion: 1`
2. **Manual Fix Required**:
   - Open workflow in n8n UI
   - Delete broken Switch node
   - Add new Switch node with proper configuration
   - Reconnect to other nodes
   - Save workflow

3. **Why No Auto-Migration**: n8n API doesn't support typeVersion conversion because parameter structures are incompatible

---

## MCP Tool Implementation Checklist

- [ ] Update `WorkflowTransformer` to always use typeVersion 3.4 for Switch nodes
- [ ] Generate UUIDs for condition IDs in rules mode
- [ ] Add validation to reject typeVersion 1 Switch nodes
- [ ] Update schema knowledge with correct formats
- [ ] Add warning when detecting typeVersion 1 Switch nodes in existing workflows

---

## Testing Checklist

When creating Switch nodes via MCP tools:

1. ✅ Verify `typeVersion: 3.4` in created node
2. ✅ Check parameters match one of the two valid formats above
3. ✅ For rules mode: verify each condition has unique `id` field
4. ✅ For expression mode: verify `numberOutputs` parameter exists
5. ✅ Open workflow in n8n UI - node should display configuration correctly
6. ✅ Test execution - routing should work as expected

---

## References

- **Working Workflow**: https://n8n.strangematic.com/workflow/euW7tBP1ddy1W2Zo
- **Broken Example**: Priority-Router node in same workflow (typeVersion 1)
- **n8n Source**: Switch node definition likely in `packages/nodes-base/nodes/Switch/`

---

## Related Documentation

- [WEBHOOK_BEHAVIOR.md](./WEBHOOK_BEHAVIOR.md) - Webhook node requirements
- MCP Schema Knowledge: `/src/knowledge/nodes/switch.md` (if exists)
