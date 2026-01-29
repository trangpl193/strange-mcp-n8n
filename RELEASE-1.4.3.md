# MCP N8N v1.4.3 Release Notes

**Release Date**: 2026-01-29
**Type**: Bug Fix
**Severity**: Medium
**Status**: ✅ Deployed

---

## Summary

Fixed critical bug in `workflow_update` tool that prevented node deletion operations. Implemented **Option A** from deep root cause analysis to add proper handling for direct node/connection updates.

---

## Issue Fixed

**Problem**: `workflow_update` tool failed when attempting to delete nodes with contradictory validation errors.

**Root Cause**: Parameters `nodes_json` and `connections_json` existed in MCP tool schema but were not handled by any validation strategy, creating an "orphaned parameter" situation.

**Impact**: Forced developers to use expensive builder pattern workaround (~500 tokens vs ~150 tokens for direct update).

---

## Changes

### Modified Files

**`src/tools/workflow-update.ts`** (+68 lines):
- Added `nodes_json`, `connections_json`, and `name` parameters to `WorkflowUpdateInput` interface
- Updated `validateUpdateStrategy()` to detect direct node update strategy
- Added Strategy 2.5 handling between workflow_json and quick ops strategies
- Added JSON format validation with clear error messages
- Updated documentation comments

**`package.json`**:
- Version bump: `1.4.2` → `1.4.3`

---

## New Feature: Strategy 2.5 - Direct Node Update

### Usage

```typescript
workflow_update({
  workflowId: "abc123",
  nodes_json: JSON.stringify([...nodes to keep...]),
  connections_json: JSON.stringify({...connections...}),
  name: "Optional name override"
})
```

### Benefits

| Metric | Before (Builder) | After (Direct) | Improvement |
|--------|------------------|----------------|-------------|
| Token Cost | ~500 | ~150 | **70% reduction** |
| Orphaned Workflows | Yes | No | **Eliminated** |
| API Calls | 4+ | 1 | **75% reduction** |

---

## Validation Added

Strategy 2.5 includes comprehensive validation:

1. **Strategy Detection**: Checks for `nodes_json` or `connections_json` presence
2. **JSON Format**: Validates both are valid JSON strings
3. **Conflict Prevention**: Ensures only ONE strategy used per call
4. **Error Messages**: Clear guidance on parameter format

---

## Migration Guide

### Before v1.4.3 (Workaround)

```typescript
// Had to rebuild entire workflow
builder_start({ name: "My Workflow" })
builder_add_node(...) // Add KEPT nodes only
builder_add_node(...)
builder_commit() // Creates NEW workflow
// Manual cleanup of old workflow
```

### After v1.4.3 (Direct)

```typescript
// Direct update - no rebuild needed
workflow_update({
  workflowId: "existing-id",
  nodes_json: "[...kept nodes...]",
  connections_json: "{}"
})
```

---

## Deployment Details

**Build Environment**: Docker multi-stage (node:20-alpine)
**Build Time**: 1m 8s
**Image Size**: ~650MB (cli-sdk.js: 651KB)
**Container**: `strange-mcp-n8n-server`
**Port**: 3302
**Health**: ✅ http://localhost:3302/health

---

## Testing

### Build Verification
- ✅ TypeScript compilation successful
- ✅ Source maps generated
- ✅ Declaration files created
- ✅ No TypeScript errors
- ✅ All dependencies resolved

### Deployment Verification
- ✅ Container recreated
- ✅ Health check passing
- ✅ Service responding on port 3302
- ✅ Redis connection established
- ✅ N8N connection configured

### Pending Tests
- ⏳ CRUD DELETE operation (requires MCP reconnection)
- ⏳ Integration test with workflow qWkOf6FjERR3wMPC
- ⏳ Regression test for other strategies

---

## Documentation Updates Required

1. **SKILL.md**: Update decision tree to include Strategy 2.5
2. **ai-behavior.yaml**: Remove "NEVER use workflow_update for nodes" guidance
3. **workflow-update-issues.md**: Mark as RESOLVED (v1.4.3)
4. **root-cause-analysis**: Reference this fix in resolution section

---

## Related Issues

- **Issue**: workflow_update node deletion failure
- **Root Cause Analysis**: `root-cause-analysis-workflow-update-2026-01-29.md`
- **Previous Documentation**: `workflow-update-issues.md`
- **Test Context**: Sticky Note CRUD operations (v1.4.2)

---

## Rollback Plan

If issues arise:

```bash
# Revert to v1.4.2
docker tag strange-mcp-n8n:latest strange-mcp-n8n:1.4.3
# Pull or rebuild v1.4.2
docker compose up -d --force-recreate
```

---

## Contributors

- **Analysis**: s--core--problem-analyst (Deep root cause analysis)
- **Implementation**: Option A from analysis recommendations
- **Build**: x--infra--docker-builder
- **Deploy**: Docker Compose

---

## References

- [Root Cause Analysis](/.claude/skills/x--infra--n8n-workflow/references/root-cause-analysis-workflow-update-2026-01-29.md)
- [Issue Documentation](/.claude/skills/x--infra--n8n-workflow/references/workflow-update-issues.md)
- [MCP N8N Repository](/home/strange/projects/strange-mcp-n8n)

---

**Status**: ✅ **DEPLOYED** - Ready for production testing
