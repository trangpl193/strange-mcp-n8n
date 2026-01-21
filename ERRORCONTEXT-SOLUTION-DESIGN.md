# ErrorContext Implementation: Solution Design

**Date:** 2026-01-21
**Status:** Ready for Implementation
**Effort:** 2 hours
**Risk:** Low

---

## 1. Problem Statement

**Current State:**
- N8NClient uses McpError but WITHOUT ErrorContext
- AI agents get generic error messages
- No recovery hints provided
- No location context for debugging

**Example Current Error:**
```typescript
throw new McpError(
  McpErrorCode.TOOL_EXECUTION_FAILED,
  `N8N API error: ${errorData.message}`,
  { details: { statusCode, n8nCode, hint, path } }
);
```

**AI Agent Sees:**
```
Error: N8N API error: Workflow validation failed
Details: { statusCode: 400, path: '/workflows' }
```

**Desired State:**
```typescript
throw new McpError(
  McpErrorCode.TOOL_EXECUTION_FAILED,
  `N8N API error: ${errorData.message}`,
  {
    context: errorContext()
      .location('N8NClient.createWorkflow')
      .operation('POST /workflows')
      .hint('Check workflow schema - ensure all nodes have valid types')
      .data('statusCode', 400)
      .build()
  }
);
```

**AI Agent Sees:**
```
Error: N8N API error: Workflow validation failed
Location: N8NClient.createWorkflow
Operation: POST /workflows
Recovery Hint: Check workflow schema - ensure all nodes have valid types
```

---

## 2. Solution Options

### Option A: Comprehensive ErrorContext (RECOMMENDED)

**Approach:** Add ErrorContext to ALL error throws with specific recovery hints

**Scope:**
- Update all 4 error scenarios in `request()` method
- Add N8N-specific recovery hints
- Include operation and location in every error

**Effort:** Medium (2 hours)
- Map all N8N error codes to recovery hints
- Update 4 error throw sites
- Add helper function for N8N error mapping

**Risk:** Low
- ErrorContext is optional (backwards compatible)
- No breaking changes to McpError interface

**Pros:**
- ✅ Best AI agent experience
- ✅ Consistent error handling
- ✅ Easy to maintain (centralized hints)
- ✅ Follows mcp-core patterns

**Cons:**
- ⚠️ Requires mapping N8N error codes
- ⚠️ Slightly more code

---

### Option B: Minimal ErrorContext

**Approach:** Add ErrorContext only to API errors, skip network/timeout errors

**Scope:**
- Update only HTTP error scenario (lines 71-82)
- Skip timeout and network errors

**Effort:** Small (1 hour)
- Only map N8N API error codes
- Single update site

**Risk:** Low

**Pros:**
- ✅ Quick to implement
- ✅ Covers most common errors

**Cons:**
- ❌ Inconsistent (some errors have context, some don't)
- ❌ Network/timeout errors still generic
- ❌ Partial pattern implementation

---

### Option C: Builder Pattern with Method Chaining

**Approach:** Create N8NErrorBuilder class for fluent error creation

**Scope:**
- New N8NErrorBuilder class
- Replace all error throws with builder
- Custom recovery hint logic

**Effort:** Large (4 hours)
- Design builder API
- Refactor all error throws
- Add unit tests for builder

**Risk:** Medium
- More abstraction to maintain
- Potential for over-engineering

**Pros:**
- ✅ Very clean error creation
- ✅ Reusable across files

**Cons:**
- ❌ Over-engineered for current need
- ❌ More code to maintain
- ❌ Not following mcp-core patterns directly

---

## 3. Trade-Off Analysis

| Criteria | Option A (Comprehensive) | Option B (Minimal) | Option C (Builder) |
|----------|-------------------------|-------------------|-------------------|
| **Effort** | 2h | 1h | 4h |
| **AI Experience** | Excellent | Good | Excellent |
| **Consistency** | High | Low | High |
| **Maintainability** | High | Medium | Medium |
| **Pattern Alignment** | ✅ mcp-core | ⚠️ Partial | ⚠️ Custom |
| **Risk** | Low | Low | Medium |
| **ROI** | **High** | Medium | Low |

---

## 4. Recommendation: **Option A - Comprehensive ErrorContext**

**Rationale:**
1. **Best AI Experience** - All errors have recovery hints
2. **Consistent Pattern** - Follows mcp-core design
3. **Reasonable Effort** - 2 hours for complete implementation
4. **Low Risk** - No breaking changes
5. **Future-Proof** - Easy to extend with more hints

**Effort Breakdown:**
- N8N error code mapping: 30 min
- Update 4 error scenarios: 45 min
- Add location tracking: 30 min
- Manual testing: 15 min

---

## 5. Detailed Design

### 5.1 N8N Error Code Mapping

```typescript
/**
 * N8N-specific recovery hints
 */
const N8N_RECOVERY_HINTS = {
  // Workflow errors
  WORKFLOW_NOT_FOUND: 'Verify workflow ID exists in N8N instance',
  WORKFLOW_VALIDATION: 'Check workflow schema - ensure all nodes have valid types and required parameters',
  WORKFLOW_DUPLICATE: 'Use a different workflow name or update existing workflow',

  // Execution errors
  EXECUTION_NOT_FOUND: 'Verify execution ID - it may have been deleted or never existed',
  EXECUTION_STILL_RUNNING: 'Wait for execution to complete before accessing full data',

  // Credential errors
  CREDENTIAL_NOT_FOUND: 'Verify credential ID or name exists in N8N',
  CREDENTIAL_INVALID: 'Check credential configuration and test connection',

  // Authentication errors
  INVALID_API_KEY: 'Verify N8N API key is correct and has not expired',
  INSUFFICIENT_PERMISSIONS: 'Check N8N user permissions for this operation',

  // Network errors
  NETWORK_ERROR: 'Check N8N instance is running and accessible',
  TIMEOUT: 'N8N instance may be slow - consider increasing timeout or checking instance health',

  // Generic
  UNKNOWN: 'Check N8N instance logs for detailed error information',
} as const;

/**
 * Map N8N HTTP status + error code to recovery hint
 */
function getN8NRecoveryHint(statusCode: number, n8nCode?: number | string): string {
  // 401 Unauthorized
  if (statusCode === 401) {
    return N8N_RECOVERY_HINTS.INVALID_API_KEY;
  }

  // 403 Forbidden
  if (statusCode === 403) {
    return N8N_RECOVERY_HINTS.INSUFFICIENT_PERMISSIONS;
  }

  // 404 Not Found
  if (statusCode === 404) {
    if (path.includes('/workflow')) return N8N_RECOVERY_HINTS.WORKFLOW_NOT_FOUND;
    if (path.includes('/execution')) return N8N_RECOVERY_HINTS.EXECUTION_NOT_FOUND;
    if (path.includes('/credential')) return N8N_RECOVERY_HINTS.CREDENTIAL_NOT_FOUND;
  }

  // 400 Bad Request - check N8N error code
  if (statusCode === 400) {
    if (n8nCode === 'WORKFLOW_VALIDATION_ERROR') {
      return N8N_RECOVERY_HINTS.WORKFLOW_VALIDATION;
    }
    if (n8nCode === 'DUPLICATE_NAME') {
      return N8N_RECOVERY_HINTS.WORKFLOW_DUPLICATE;
    }
  }

  // 409 Conflict
  if (statusCode === 409) {
    return N8N_RECOVERY_HINTS.EXECUTION_STILL_RUNNING;
  }

  return N8N_RECOVERY_HINTS.UNKNOWN;
}
```

---

### 5.2 Updated Error Handling

#### Scenario 1: HTTP API Error (400, 404, 500, etc.)

**Before:**
```typescript
throw new McpError(
  McpErrorCode.TOOL_EXECUTION_FAILED,
  `N8N API error: ${errorData.message}`,
  {
    details: {
      statusCode: response.status,
      n8nCode: errorData.code,
      hint: errorData.hint,
      path,
    },
  }
);
```

**After:**
```typescript
import { errorContext } from '@strange/mcp-core';

throw new McpError(
  McpErrorCode.TOOL_EXECUTION_FAILED,
  `N8N API error: ${errorData.message}`,
  {
    context: errorContext()
      .location('N8NClient.request')
      .operation(`${method} ${path}`)
      .hint(getN8NRecoveryHint(response.status, errorData.code))
      .data('statusCode', response.status)
      .data('n8nCode', errorData.code)
      .data('path', path)
      .build()
  }
);
```

---

#### Scenario 2: Timeout Error

**Before:**
```typescript
throw new McpError(
  McpErrorCode.TIMEOUT,
  `Request to N8N API timed out after ${this.timeout}ms`,
  { details: { path } }
);
```

**After:**
```typescript
throw new McpError(
  McpErrorCode.TIMEOUT,
  `Request to N8N API timed out after ${this.timeout}ms`,
  {
    context: errorContext()
      .location('N8NClient.request')
      .operation(`${method} ${path}`)
      .hint(N8N_RECOVERY_HINTS.TIMEOUT)
      .data('timeout_ms', this.timeout)
      .data('path', path)
      .build()
  }
);
```

---

#### Scenario 3: Network Error

**Before:**
```typescript
throw new McpError(
  McpErrorCode.CONNECTION_FAILED,
  `Network error: ${error.message}`,
  { details: { path, originalError: error.message } }
);
```

**After:**
```typescript
throw new McpError(
  McpErrorCode.CONNECTION_FAILED,
  `Network error: ${error.message}`,
  {
    context: errorContext()
      .location('N8NClient.request')
      .operation(`${method} ${path}`)
      .hint(N8N_RECOVERY_HINTS.NETWORK_ERROR)
      .data('path', path)
      .data('originalError', error.message)
      .build()
  }
);
```

---

#### Scenario 4: Unknown Error

**Before:**
```typescript
throw new McpError(
  McpErrorCode.INTERNAL_ERROR,
  'Unknown error occurred',
  { details: { path } }
);
```

**After:**
```typescript
throw new McpError(
  McpErrorCode.INTERNAL_ERROR,
  'Unknown error occurred',
  {
    context: errorContext()
      .location('N8NClient.request')
      .operation(`${method} ${path}`)
      .hint(N8N_RECOVERY_HINTS.UNKNOWN)
      .data('path', path)
      .build()
  }
);
```

---

### 5.3 File Structure

```
src/services/
├── n8n-client.ts
│   ├── N8N_RECOVERY_HINTS (constant)
│   ├── getN8NRecoveryHint() (helper function)
│   └── N8NClient class
│       └── request() method (4 error scenarios updated)
```

**No new files needed** - everything in existing n8n-client.ts

---

## 6. Implementation Phases

### Phase 1: Add Recovery Hints (30 min)
```typescript
// Add at top of n8n-client.ts
const N8N_RECOVERY_HINTS = { ... };
function getN8NRecoveryHint(statusCode, n8nCode, path) { ... }
```

### Phase 2: Update Error Throws (45 min)
```typescript
// Import errorContext
import { errorContext } from '@strange/mcp-core';

// Update 4 error scenarios in request() method
// - HTTP API error
// - Timeout error
// - Network error
// - Unknown error
```

### Phase 3: Manual Testing (15 min)
```bash
# Test scenarios:
1. Invalid API key (401)
2. Workflow not found (404)
3. Invalid workflow schema (400)
4. Timeout (abort)
5. Network error (N8N down)
```

### Phase 4: Verify (30 min)
```bash
# Run tests
npm run test

# Check coverage still >= 74%
npm run test:coverage

# Manual UAT with MCP CLI
# Trigger errors and verify ErrorContext in responses
```

---

## 7. Success Criteria

✅ **All 4 error scenarios** have ErrorContext
✅ **Recovery hints** present in all errors
✅ **Location** shows method name (N8NClient.request)
✅ **Operation** shows HTTP method + path
✅ **Tests** still passing (45/45)
✅ **Coverage** maintained (>= 74%)

---

## 8. Impact Assessment

### Before
```
AI Agent sees:
  Error: N8N API error: Workflow not found

AI Agent action:
  ❓ Retries same request
  ❓ Asks user "what's wrong?"
```

### After
```
AI Agent sees:
  Error: N8N API error: Workflow not found
  Location: N8NClient.request
  Operation: GET /workflows/{id}
  Recovery Hint: Verify workflow ID exists in N8N instance

AI Agent action:
  ✅ Knows to check workflow ID
  ✅ Can suggest workflow_list to find correct ID
  ✅ Better user experience
```

---

## 9. Example Error Output

### HTTP 404 Error
```json
{
  "error": {
    "code": "TOOL_EXECUTION_FAILED",
    "message": "N8N API error: Workflow not found",
    "context": {
      "location": "N8NClient.request",
      "operation": "GET /workflows/abc-123",
      "recovery_hint": "Verify workflow ID exists in N8N instance",
      "data": {
        "statusCode": 404,
        "path": "/workflows/abc-123"
      }
    }
  }
}
```

### Timeout Error
```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Request to N8N API timed out after 30000ms",
    "context": {
      "location": "N8NClient.request",
      "operation": "POST /workflows",
      "recovery_hint": "N8N instance may be slow - consider increasing timeout or checking instance health",
      "data": {
        "timeout_ms": 30000,
        "path": "/workflows"
      }
    }
  }
}
```

---

## 10. Next Steps

**After Approval:**
1. Implement Phase 1 (Recovery hints) - 30 min
2. Implement Phase 2 (Error updates) - 45 min
3. Manual testing - 15 min
4. Verify tests - 30 min

**Total:** 2 hours

**Handoff:** Ready for x--core--code-builder or direct implementation

---

## 11. References

- mcp-core ErrorContext: `/home/strange/projects/strange-mcp-core/src/errors/context.ts`
- Current N8NClient: `/home/strange/projects/strange-mcp-n8n/src/services/n8n-client.ts`
- UAT Analysis: `/home/strange/projects/strange-mcp-n8n/UAT-ANALYSIS-2026-01-21.md`
