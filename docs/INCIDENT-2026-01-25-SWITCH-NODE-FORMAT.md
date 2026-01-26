# Incident Report: Switch Node Format Issue

**Date**: 2026-01-25
**Severity**: Critical
**Status**: Resolved
**Session**: eeb33dca-d8ba-4255-8c81-4e2e0b5da112

## Summary

Context Manager Bot workflow and all test workflows with Switch nodes failed to render in N8N UI due to Knowledge-Practice Gap between schema documentation and actual N8N UI requirements.

## Timeline

| Time | Event |
|------|-------|
| 06:10 | Context Manager Bot v2 created via builder (jckoh1tV8qFoYrAo) |
| 06:28-06:38 | Test workflows 1-5 created for debugging |
| 06:40 | User reported: Test 2 and 4 fail, others OK |
| 06:45 | Isolated problem to Switch nodes |
| 06:49 | User provided error: "Could not find property option" |
| 06:50 | Analyzed UAT workflow (c5oHF5bn1SJARsfd) - found format mismatch |
| 06:51 | Fixed all Switch nodes manually with correct format |
| 06:52 | Root cause analysis: Schema knowledge wrong |
| 07:00 | Complete solution implemented with autonomous validation design |

## Root Cause

**Knowledge-Practice Gap**: Schema knowledge documented incorrect Switch node format.

### What Was Wrong

**Schema Documentation**:
```json
{
  "mode": "rules",
  "rules": {
    "values": [...]  // ❌ Wrong
  }
}
```

**Actual N8N UI Requirement**:
```json
{
  "mode": "expression",           // ✅ Required
  "output": "multipleOutputs",    // ✅ Required
  "rules": {
    "rules": [                    // ✅ Not "values"!
      {
        "outputKey": "branch_1",  // ✅ Required per rule
        "conditions": {...}
      }
    ]
  }
}
```

### Why It Happened

1. Schema knowledge was **inferred** from API documentation, not validated against working examples
2. N8N API **accepts multiple formats** (permissive validation)
3. N8N UI **only renders specific format** (strict validation)
4. Builder followed schema → generated API-valid but UI-incompatible workflows
5. No post-commit validation to catch this mismatch

## Impact

**Affected Workflows**:
- Context Manager Bot v2 (jckoh1tV8qFoYrAo)
- Test 2 - With Switch (GdxhPlZ3bHX9pOCh)
- Test 4 - Full Structure (c0yDiSKj1LdtLUU1)
- Test 5 - Minimal Switch (SsCOOZDSAt046tlN)

**Symptoms**:
- Workflows created successfully (HTTP 200)
- Workflows appeared in N8N list
- Opening workflow showed **blank canvas**
- Browser console error: "Could not find property option" / "Could not find workflow"
- All nodes invisible, workflow unusable

**User Impact**:
- Context Manager Bot unusable
- Trust in builder system damaged
- Manual intervention required

## Resolution

### Immediate Fix

1. ✅ Manually updated all 4 workflows with correct format using `node_update`
2. ✅ All workflows now render correctly in N8N UI

### Systemic Fix

| Component | Change | File |
|-----------|--------|------|
| **Schema** | Added `expression-multipleOutputs` format | src/knowledge/schemas/switch-node.ts |
| **Quirks** | Created `switch-node-triple-format` entry | src/knowledge/quirks/switch-node.ts |
| **Builder** | Added `applySwitchNodeMultipleOutputsFormat()` | src/tools/builder-add-node.ts |
| **Transformer** | Support `rules.rules` counting | src/services/workflow-transformer.ts |
| **Design** | Autonomous validation architecture | docs/AUTONOMOUS-VALIDATION-AGENT.md |

### Future Prevention

**3-Layer Autonomous Validation System**:

```
┌─ Layer 1: Pre-Commit Validation ─────────────────┐
│  • Auto-transform nodes to UI-compatible format  │
│  • Quirks check with auto-fix                    │
└───────────────────────────────────────────────────┘
                    ↓
┌─ Layer 2: Post-Commit Validation ────────────────┐
│  • Fetch created workflow from N8N               │
│  • Validate against quirks database              │
│  • Auto-repair if issues detected                │
└───────────────────────────────────────────────────┘
                    ↓
┌─ Layer 3: Autonomous Repair Agent ───────────────┐
│  • Scheduled health check (daily 2 AM)           │
│  • Scan all workflows for known issues           │
│  • Auto-fix incompatible formats                 │
│  • Update knowledge base from repairs            │
└───────────────────────────────────────────────────┘
```

## Lessons Learned

### What Went Wrong

1. **Trusted inference over validation** - Schema was inferred, not validated against UAT
2. **No post-commit validation** - Assumed API success = UI success
3. **Manual fixes don't scale** - Fixed 4 workflows manually, could be 40+ next time

### What Went Right

1. **Systematic debugging** - Created test workflows to isolate problem
2. **Found ground truth** - UAT workflow provided correct format
3. **Comprehensive fix** - Fixed root cause, not just symptoms
4. **Designed prevention** - Autonomous validation prevents recurrence

### Action Items

- [x] Fix all broken workflows
- [x] Update schema knowledge
- [x] Add quirks database entry
- [x] Implement builder transform logic
- [x] Design autonomous validation system
- [ ] Implement pre-commit validation
- [ ] Implement post-commit validation
- [ ] Build autonomous repair agent
- [ ] Create N8N health check workflow
- [ ] Review other node schemas for similar gaps

## References

- **Conversation**: /home/strange/.user/conversation/25-1-2026.md
- **Schema**: /home/strange/projects/strange-mcp-n8n/src/knowledge/schemas/switch-node.ts
- **Quirks**: /home/strange/projects/strange-mcp-n8n/src/knowledge/quirks/switch-node.ts
- **Design**: /home/strange/projects/strange-mcp-n8n/docs/AUTONOMOUS-VALIDATION-AGENT.md
- **UAT Example**: Workflow c5oHF5bn1SJARsfd (UAT S2: Conditional Routing)
- **Session Context**: agent.sessions.eeb33dca-d8ba-4255-8c81-4e2e0b5da112

## Status

**Current**: ✅ Resolved
- All affected workflows fixed and rendering correctly
- Builder will auto-transform future Switch nodes
- Autonomous validation design complete, implementation pending

**Next**: Implementation of autonomous validation pipeline

---

*This incident demonstrates the importance of validating schema knowledge against working examples and implementing multi-layer validation to catch API/UI mismatches.*
