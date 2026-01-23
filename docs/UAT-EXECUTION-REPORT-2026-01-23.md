# UAT Execution Report - MCP N8N Comprehensive Validation

**Date:** 2026-01-23
**Executor:** AI Agent (Claude Code)
**Environment:** Production (mcp-n8n.strangematic.com)
**MCP Server Version:** 1.2.0
**UAT Document:** UAT-COMPREHENSIVE-SCENARIOS.yaml v1.0

---

## Executive Summary

**RECOMMENDATION:** 🛑 **REJECT** - Critical issues found, **DO NOT** use in production

### Critical Findings

1. **❌ BLOCKER: Knowledge Layer Not Deployed**
   - Phase 3A code exists but MCP tools not registered
   - Missing: schema_get, schema_list, quirks_check, quirks_search, schema_validate
   - Impact: Primary value proposition (If-node quirk detection) unavailable

2. **❌ BLOCKER: Multi-Output Node Connections Broken**
   - IF/Switch nodes create linear connections instead of branches
   - Creates logically incorrect workflows
   - Impact: Complex workflows completely broken

3. **❌ Builder Pattern Bug**
   - builder_commit incorrectly rejects valid workflows with trigger nodes
   - Workaround: Use workflow_create instead

---

## Detailed Results

### UAT-001: Health Check & Basic Operations
**Status:** ⚠️ **PARTIAL PASS** (1/3 steps)

| Step | Tool | Status | Notes |
|------|------|--------|-------|
| 1 | workflow_list | ✅ PASS | Retrieved 29 workflows successfully |
| 2 | schema_list | ❌ FAIL | Tool not available - not registered in MCP server |
| 3 | quirks_search | ❌ FAIL | Tool not available - not registered in MCP server |

**Analysis:**
- Basic infrastructure (workflow CRUD) works
- Knowledge layer completely missing from deployment
- Code exists at `/src/knowledge/` but not integrated into server-sdk.ts

**Impact:** Phase 3A claimed as "Production Complete" but **NOT DEPLOYED**

---

### UAT-002: If-Node Workflow with Correct Schema
**Status:** ❌ **FAIL** (Critical bug found)

**Attempted Approach 1: Builder Pattern**

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1-2 | schema_get, quirks_check | ⚠️ SKIP | Tools not available |
| 3-7 | Builder: add nodes | ✅ PASS | 4 nodes added successfully |
| 8-10 | Builder: connect nodes | ✅ PASS | 3 connections created |
| 11 | builder_preview | ✅ PASS | Valid structure, trigger detected |
| 12 | builder_commit | ❌ FAIL | "Workflow must have at least one trigger node" |

**Bug Found:**
```
Error: "Workflow must have at least one trigger node (webhook, schedule, or manual)"
Preview shows: "trigger_type": "manual" ✓
Commit rejects: No trigger ✗
```

**Root Cause:** builder_commit validation logic inconsistent with builder_preview

**Attempted Approach 2: workflow_create**

| Step | Action | Status | Workflow ID |
|------|--------|--------|-------------|
| 1 | Create workflow | ✅ PASS | TJCR80SpeMAejvXr |
| 2 | Verify structure | ❌ FAIL | Connections incorrect |

**CRITICAL BUG:**

**Expected Connections:**
```
Manual → IF → True Branch (output 0)
           └→ False Branch (output 1)
```

**Actual Connections:**
```
Manual → IF → True Branch → False Branch
```

**Retrieved Workflow:**
```json
{
  "connections": [
    {"from": "Manual", "to": "If 2", "type": "main"},
    {"from": "If 2", "to": "True Branch", "type": "main"},
    {"from": "True Branch", "to": "False Branch", "type": "main"}
  ]
}
```

**Impact:**
- IF node logic completely broken
- True branch ALWAYS executes
- False branch executes AFTER true branch (incorrect)
- Workflow is logically invalid but N8N API accepts it

**If-Node Parameters (Correct):**
```json
{
  "combinator": "and",
  "conditions": [{
    "leftValue": "={{ $json.status }}",
    "rightValue": "active",
    "operator": {"type": "string", "operation": "equals"}
  }]
}
```

The node configuration uses correct **combinator** format (Phase 3A goal), but connections are broken.

---

### UAT-007: Complex Data Pipeline (End-to-End)
**Status:** ❌ **FAIL** (Same critical bug)

**Workflow Created:** u3MZXUz2L5UgzSP1

**Architecture:**
```
Expected:
Webhook → Transform Data → Check Priority (IF)
                             ├─ true  → Notify High Priority
                             └─ false → Log Low Priority

Actual (WRONG):
Webhook → Transform Data → Check Priority → Notify High Priority → Log Low Priority
```

**Retrieved Connections:**
```json
[
  {"from": "Webhook", "to": "Transform Data"},
  {"from": "Transform Data", "to": "Check Priority"},
  {"from": "Check Priority", "to": "Notify High Priority"},
  {"from": "Notify High Priority", "to": "Log Low Priority"}
]
```

**Impact:**
- Complex pipelines completely broken
- Conditional routing doesn't work
- Low priority handler ALWAYS executes (after high priority)
- This is the **MOST CRITICAL** scenario failure

**Code-Node Configuration (Correct):**
```javascript
const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    priority: item.json.amount > 1000 ? 'high' : 'low'
  }
}));
```

**IF-Node Configuration (Correct):**
```json
{
  "combinator": "and",
  "conditions": [{
    "leftValue": "={{ $json.priority }}",
    "rightValue": "high",
    "operator": {"type": "string", "operation": "equals"}
  }]
}
```

All node configurations are correct. The bug is in **connection generation**.

---

### UAT-008: Workflow Update Operations
**Status:** ⚠️ **PARTIAL PASS**

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1 | Get workflow | ✅ PASS | Retrieved UAT-002 workflow |
| 2 | Update name | ❌ FAIL | Update called but name not changed |
| 3 | Verify update | ❌ FAIL | Name still "UAT-002 If-Node Test" |

**Update Request:**
```
workflowId: TJCR80SpeMAejvXr
name: "UAT-002 If-Node Test (Updated)"
```

**Result:** No error returned, but name unchanged.

**Impact:** Medium - Update API may have issues

---

### UAT-003, 004, 005, 006: Not Executed
**Reason:** Critical bugs found in UAT-002 and UAT-007 are blockers

**Expected Impact:**
- UAT-003 (Switch): Same multi-output connection bug
- UAT-004 (Filter): Likely works (single output)
- UAT-005 (Code): Likely works (single output)
- UAT-006 (Postgres): Likely works but credential handling untested

---

## Root Cause Analysis

### Issue 1: Knowledge Layer Not Deployed

**Code Location:** `/src/knowledge/tools.ts`

**Functions Implemented:**
- schema_get()
- schema_list()
- quirks_check()
- quirks_search()
- schema_validate()

**Missing Integration:** server-sdk.ts lines 66-400

**What's Missing:**
```typescript
// NOT FOUND in server-sdk.ts:
import { schema_get, schema_list, quirks_check, quirks_search, schema_validate } from './knowledge/tools.js';

server.registerTool('schema_get', {...}, async (args) => {...});
server.registerTool('schema_list', {...}, async (args) => {...});
server.registerTool('quirks_check', {...}, async (args) => {...});
server.registerTool('quirks_search', {...}, async (args) => {...});
server.registerTool('schema_validate', {...}, async (args) => {...});
```

**Fix Required:** Register 5 knowledge tools in server-sdk.ts

---

### Issue 2: Multi-Output Node Connection Bug

**Affected Nodes:**
- IF (2 outputs: true/false)
- Switch (N outputs: routes + fallback)

**Problem:** workflow-create.ts / WorkflowTransformer

**Expected Logic:**
```
When node has multiple outputs:
  - Connect next node to specific output port
  - IF node: next_node → output 0, subsequent_node → output 1
  - Switch node: route nodes to output 0,1,2...N
```

**Actual Logic:**
```
All nodes connected linearly to output 0
```

**Code Location:**
- `/src/tools/workflow-create.ts`
- `/src/services/WorkflowTransformer.ts`

**Previous Fix:** E2E tests showed this was fixed in commit 8a722ae (2026-01-22)

**Status:** Fix NOT deployed to production or regression occurred

**Evidence from Context:**
```
Decision: "E2E Test Fixes Completed and Pushed"
Commit: 8a722ae
Changes: "workflow-transformer.ts: Multi-output port logic for IF/Switch nodes"
Test Results: "113 passed, 0 failed"
```

**Discrepancy:** Tests pass but production deployment broken

**Hypothesis:**
1. Fix committed but not deployed (Docker image not rebuilt)
2. Fix deployed but regression in subsequent commit
3. Tests don't accurately reflect production behavior

---

### Issue 3: builder_commit Trigger Validation Bug

**Code Location:** `/src/tools/builder-commit.ts` or similar

**Validation Logic:**
```
builder_preview: Detects trigger correctly ✓
builder_commit: Fails to detect same trigger ✗
```

**Preview Output:**
```json
{
  "summary": {
    "trigger_type": "manual"
  }
}
```

**Commit Error:**
```
"Workflow must have at least one trigger node (webhook, schedule, or manual)"
```

**Fix Required:** Align builder_commit validation with builder_preview logic

---

## Production Readiness Assessment

### Deployment Status vs Claims

| Component | Claimed Status | Actual Status | Gap |
|-----------|---------------|---------------|-----|
| Phase 1 (CRUD) | ✅ Complete | ✅ Complete | None |
| Phase 2A (Builder) | ✅ Complete | ⚠️ Partial | builder_commit bug |
| Phase 2B (Node Tools) | ✅ Complete | ❓ Untested | - |
| **Phase 3A (Knowledge)** | **✅ Complete** | **❌ Not Deployed** | **5 MCP tools** |
| IF/Switch Support | ✅ Fixed (8a722ae) | ❌ Broken | Connection logic |

### Context Evidence vs Reality

**From session_contexts:**

> **Decision:** "Phase 3A Knowledge Layer - Production Deployment Complete"
> **Date:** 2026-01-22 15:21 UTC
> **Status:** ✅ PRODUCTION COMPLETE
> **Features Deployed:**
> - AI self-diagnosis (real-time validation, quirk detection)
> - UI-breaking prevention (If-node dual format detection)
> - Knowledge base (3 schemas, 1 critical quirk, version-aware)
> - MCP integration (5 tools for Claude Code)

**UAT Reality:**
- ❌ AI self-diagnosis: NOT AVAILABLE (schema_get missing)
- ❌ Quirk detection: NOT AVAILABLE (quirks_check missing)
- ❌ Knowledge base: NOT ACCESSIBLE (schema_list missing)
- ❌ MCP integration: 0/5 tools registered
- ❌ IF-node support: BROKEN (connection bug)

**Conclusion:** Phase 3A code committed but **NOT integrated** into MCP server deployment.

---

## Impact Assessment

### Business Impact

**Phase 3A Value Proposition:**
> "Before: 2h manual debug, 0% self-service"
> "After: Real-time validation, prevent UI breakage"

**Actual State:**
- ❌ No real-time validation (tools missing)
- ❌ No UI breakage prevention (tools missing)
- ❌ Still requires manual debugging
- ❌ 0% self-service (unchanged)

**ROI:** $0 - Feature not delivered despite "production complete" claim

### Technical Impact

**Workflows Created via MCP:**
- ✅ Simple linear workflows: Work correctly
- ⚠️ Workflows with Code/Set/HTTP nodes: Work correctly
- ❌ **Workflows with IF nodes: Logically broken**
- ❌ **Workflows with Switch nodes: Logically broken**
- ❌ Complex conditional pipelines: Completely unusable

**Risk Level:** 🔴 **CRITICAL**

**User Experience:**
1. User creates workflow via MCP with IF/Switch logic
2. Workflow appears to be created successfully
3. N8N UI shows workflow (nodes visible)
4. User executes workflow → **Incorrect behavior**
5. Debug time: 30min - 2h (same as before Phase 3A)

**Worse Than Before:**
- Before: User writes N8N JSON directly → correct behavior
- After: User uses MCP tool → incorrect behavior
- Result: **Negative value add**

---

## Recommended Actions

### Immediate (Block Production Use)

1. **⚠️ WARNING: Do not use MCP N8N for IF/Switch workflows**
   - Workflows will be created with incorrect logic
   - Silent failure - no error returned
   - Debugging required after workflow creation

2. **Roll back "Phase 3A Complete" claim**
   - Update session context: Status → "Code Complete, Deployment Pending"
   - Update documentation: Remove "Production Complete" references

### Priority 1: Fix Multi-Output Connection Bug (Critical)

**Estimated Effort:** 2-4 hours

**Steps:**
1. Review commit 8a722ae changes in workflow-transformer.ts
2. Verify fix is correct in source code
3. Check if fix is in current Docker image
4. If missing: Rebuild and redeploy Docker image
5. If present: Debug regression (check for subsequent commits)
6. Re-run E2E tests against production MCP server
7. Re-run UAT-002 and UAT-007 to verify fix

**Validation:**
```bash
# After fix, these should show branched connections:
# UAT-002: Manual → IF → [True Branch, False Branch]
# UAT-007: IF → [HTTP, Set]
```

### Priority 2: Deploy Knowledge Layer Tools (Critical)

**Estimated Effort:** 3-5 hours

**Steps:**
1. Add imports to server-sdk.ts:
   ```typescript
   import {
     schema_get,
     schema_list,
     quirks_check,
     quirks_search,
     schema_validate
   } from './knowledge/tools.js';
   ```

2. Register 5 MCP tools (following existing pattern)

3. Define Zod schemas for each tool's input

4. Test each tool via MCP protocol

5. Update server version to 1.3.0

6. Rebuild Docker image

7. Deploy to production

8. Re-run UAT-001 steps 2-3 to verify

**Validation:**
```bash
# After deployment:
mcp__strange-mcp-n8n__schema_list → Returns 3+ schemas
mcp__strange-mcp-n8n__quirks_search query="format" → Returns If-node quirk
```

### Priority 3: Fix builder_commit Validation (Medium)

**Estimated Effort:** 1-2 hours

**Steps:**
1. Review builder_commit.ts validation logic
2. Compare with builder_preview.ts trigger detection
3. Align validation logic
4. Test with manual trigger workflow
5. Deploy fix

**Validation:**
```bash
# After fix:
builder_preview → trigger_type: "manual"
builder_commit → Success (not rejected)
```

### Priority 4: Fix workflow_update Name Change (Low)

**Estimated Effort:** 1 hour

**Impact:** Low - workaround exists (recreate workflow)

---

## Test Recommendations

### Before Next Deployment

1. **Run Full E2E Suite Against Production**
   ```bash
   # Current: E2E tests run against local test instance
   # Required: E2E tests run against mcp-n8n.strangematic.com
   ```

2. **Add UAT Scenarios to CI/CD**
   - Automate UAT-001, 002, 007 execution
   - Fail deployment if UAT fails
   - Validate connections, not just workflow creation

3. **Add Connection Validation Tests**
   ```typescript
   // Test: IF node should have 2 outgoing connections
   expect(connections.filter(c => c.from === 'IF')).toHaveLength(2);
   expect(connections).toContainEqual({from: 'IF[0]', to: 'TrueBranch'});
   expect(connections).toContainEqual({from: 'IF[1]', to: 'FalseBranch'});
   ```

### Test Coverage Gaps

**Current Coverage:**
- ✅ Unit tests: 100% knowledge layer
- ✅ E2E tests: 113 passing
- ❌ **Production validation: 0%**

**Gap:** E2E tests don't reflect production behavior

**Hypothesis:**
- E2E tests use mocked N8N API
- Production uses real N8N API
- Different behavior between mock and real API

**Recommendation:**
- Add integration tests against real N8N instance
- Add UAT smoke tests to deployment pipeline

---

## Conclusion

### Summary

The MCP N8N server v1.2.0 is **NOT production-ready** due to:

1. **Critical Bug:** Multi-output node connections broken (IF/Switch)
2. **Missing Deployment:** Phase 3A knowledge tools not registered
3. **Medium Bug:** builder_commit false trigger validation
4. **Low Bug:** workflow_update name change not working

### Production Use Guidance

**Safe Use Cases:**
- ✅ Simple linear workflows (Webhook → Code → Set)
- ✅ Single-branch processing pipelines
- ✅ Workflows without IF/Switch nodes

**Unsafe Use Cases:**
- ❌ Conditional routing (IF/Switch)
- ❌ Multi-branch workflows
- ❌ Complex decision trees
- ❌ Any workflow requiring Phase 3A knowledge layer

### Deployment Recommendation

**Status:** 🛑 **REJECT**

**Reasons:**
1. Primary value proposition (Phase 3A) not delivered
2. Critical bugs create incorrect workflows
3. No warning to users about broken functionality
4. Higher risk than manual workflow creation

**Next Steps:**
1. Fix Priority 1 (multi-output connections) - **BLOCKER**
2. Fix Priority 2 (deploy knowledge layer) - **BLOCKER**
3. Re-run full UAT validation
4. If all scenarios pass → **CONDITIONAL APPROVAL**

**Timeline Estimate:**
- Fixes: 6-11 hours
- Testing: 2-3 hours
- Deployment: 1 hour
- **Total: 9-15 hours** (2-3 work sessions)

---

## Appendix: Session Context Update

**Record Decision:**

```yaml
decision_id: uat-execution-2026-01-23
title: "UAT Validation Failed - Production Not Ready"
context: |
  Executed comprehensive UAT scenarios against production MCP N8N server.
  Found critical bugs and missing deployment of Phase 3A knowledge layer.

options:
  1. Approve deployment despite issues
  2. Reject deployment, require fixes
  3. Conditional approval for limited use cases

decision: "Option 2: Reject deployment"

rationale: |
  - Multi-output node bug creates logically incorrect workflows
  - Phase 3A claimed as complete but not deployed (0/5 tools)
  - Risk of user confusion and incorrect workflow behavior
  - Better to delay than ship broken feature

impact:
  - Phase 3A: Code complete but not production ready
  - Estimated fix time: 9-15 hours
  - Re-validation required after fixes

next_actions:
  - Fix multi-output connection logic
  - Register knowledge layer MCP tools
  - Rebuild and redeploy Docker image
  - Re-run UAT scenarios
```

---

**Report Generated:** 2026-01-23 18:24 UTC
**Executor:** AI Agent (Claude Code)
**UAT Execution Time:** 15 minutes
**Scenarios Executed:** 3/9 (blocked by critical bugs)
