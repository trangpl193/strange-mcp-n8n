# E2E Test Suite for MCP N8N

Comprehensive end-to-end testing suite for the strange-mcp-n8n server.

## Overview

This test suite validates the entire MCP N8N workflow lifecycle from creation through execution, with focus on:
- **Builder Pattern** (session-based workflow construction)
- **Direct CRUD** (traditional workflow operations)
- **Complex Workflows** (multi-step, branching, parallel processing)
- **Error Handling** (resilience, validation, edge cases)

## Test Structure

```
__tests__/
├── e2e/
│   ├── builder-workflow.test.ts       # Builder pattern lifecycle
│   ├── crud-operations.test.ts        # Direct workflow CRUD
│   ├── complex-workflows.test.ts      # Complex multi-step scenarios
│   └── error-handling.test.ts         # Error cases & edge scenarios
├── fixtures/
│   ├── workflows.ts                   # Simple workflow fixtures
│   └── complex-scenarios.ts           # Complex real-world workflows
├── unit/                              # Unit tests for individual components
├── integration/                       # Integration tests
└── mocks/                             # Mock implementations
```

## Test Scenarios

### 1. Builder Workflow Tests (`builder-workflow.test.ts`)

**Complete Builder Lifecycle:**
- ✅ Build simple webhook workflow step-by-step
- ✅ Build complex multi-step workflow with branching
- ✅ Session discovery (Blind Box Problem solution)
- ✅ Session expiration handling
- ✅ Discard sessions without committing
- ✅ Prevent operations on committed sessions
- ✅ Handle concurrent sessions independently
- ✅ Error handling (invalid nodes, missing connections)

**Key Validations:**
- Session TTL management
- Node connection integrity
- Workflow structure preservation
- Trigger node requirement

### 2. CRUD Operations Tests (`crud-operations.test.ts`)

**CREATE Operations:**
- ✅ Simple webhook workflow
- ✅ Workflow with credentials
- ✅ Workflow activation
- ✅ Workflow with tags

**READ Operations:**
- ✅ Get workflow by ID
- ✅ List workflows with filters
- ✅ Filter by active status
- ✅ Search by name

**UPDATE Operations:**
- ✅ Rename workflow
- ✅ Activate/deactivate workflow
- ✅ Add/remove tags
- ✅ Update workflow structure

**Node-Level Operations:**
- ✅ Get individual node
- ✅ Update node parameters
- ✅ Rename node
- ✅ Disable/enable node
- ✅ Update node position

**Validation & Constraints:**
- ✅ Reject workflow without trigger
- ✅ Reject invalid workflow structure
- ✅ Reject update to non-existent workflow
- ✅ Handle concurrent operations

### 3. Complex Workflows Tests (`complex-workflows.test.ts`)

Tests 7 real-world scenarios from `fixtures/complex-scenarios.ts`:

**Scenario 1: Data Pipeline**
- Webhook → HTTP Fetch → Transform → PostgreSQL Insert → Respond
- Validates: Linear chain, DB operations, HTTP calls

**Scenario 2: Validation Workflow**
- Webhook → Validate → IF (Valid/Invalid) → Process/Reject → Respond
- Validates: Conditional branching, dual paths

**Scenario 3: Switch Workflow**
- Schedule → Query DB → Switch by Priority → Different Actions
- Validates: Multi-branch routing, schedule trigger

**Scenario 4: Parallel Processing**
- Trigger → Split → Parallel Branches → Merge → Report
- Validates: Parallel execution, merge operations

**Scenario 5: Error Handling**
- Webhook → Try API → IF Failed → Retry → Fallback
- Validates: Error resilience, fallback paths

**Scenario 6: Database Transaction**
- Manual → Multi-step DB Updates → Verification
- Validates: Sequential DB operations

**Scenario 7: Monitoring**
- Schedule → Health Checks → Alert on Issues
- Validates: Periodic execution, alerting

### 4. Error Handling Tests (`error-handling.test.ts`)

**API Errors:**
- ✅ 404 for non-existent workflow/execution
- ✅ Authentication errors (401)
- ✅ Malformed data handling

**Validation Errors:**
- ✅ Workflow without name/steps
- ✅ Workflow without trigger
- ✅ Invalid node types
- ✅ Invalid connection parameters

**State Management Errors:**
- ✅ Operations on non-existent session
- ✅ Double commit prevention
- ✅ Expired session handling
- ✅ Update deleted workflow

**Edge Cases:**
- ✅ Workflow with 20+ nodes
- ✅ Deeply nested node names
- ✅ Special characters in names
- ✅ Very long code blocks
- ✅ Concurrent session creation
- ✅ Rapid updates to same workflow

**Security:**
- ✅ SQL injection-like strings
- ✅ XSS-like strings
- ✅ Control characters

## Running Tests

### Prerequisites

1. **N8N Instance**: Running N8N server (local or remote)
2. **Environment Variables**:
   ```bash
   export N8N_URL="https://your-n8n-instance.com"
   export N8N_API_KEY="your-api-key"
   ```

### Run All Tests

```bash
# Run all tests
npm test

# Run only E2E tests
npm test __tests__/e2e

# Run specific test file
npm test __tests__/e2e/builder-workflow.test.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Skip E2E Tests

If `N8N_URL` and `N8N_API_KEY` are not set, E2E tests are automatically skipped.

```bash
# Run without E2E
unset N8N_URL N8N_API_KEY
npm test
```

## Expected Results

### Coverage Targets

| Category | Target | Actual |
|----------|--------|--------|
| Statements | 80% | TBD |
| Branches | 80% | TBD |
| Functions | 80% | TBD |
| Lines | 80% | TBD |

### Test Counts

| Test Suite | Tests | Expected Pass |
|------------|-------|---------------|
| builder-workflow | 12+ | 100% |
| crud-operations | 25+ | 100% |
| complex-workflows | 20+ | 100% |
| error-handling | 30+ | 100% |
| **Total E2E** | **87+** | **100%** |

## Design Comparison: Expected vs Actual

### Workflow Structure Validation

Each test validates that the created workflow matches design expectations:

```typescript
// Expected (from EXPECTED_OUTCOMES)
{
  nodes_count: 5,
  trigger_type: 'webhook',
  has_db_operation: true,
  has_http_call: true,
  ends_with_respond: true,
}

// Actual (from N8N API)
const workflow = await workflowGet(client, { workflow_id });

expect(workflow.nodes).toHaveLength(5);
expect(workflow.nodes[0].type).toContain('webhook');
expect(workflow.nodes.some(n => n.type.includes('postgres'))).toBe(true);
expect(workflow.nodes.some(n => n.type.includes('httpRequest'))).toBe(true);
expect(workflow.nodes[workflow.nodes.length - 1].type).toContain('respondToWebhook');
```

### Connection Integrity

Tests verify that node connections preserve the workflow graph:

```typescript
// Linear chain
expect(workflow.connections).toBeDefined();
const connectionCount = Object.keys(workflow.connections).length;
expect(connectionCount).toBeGreaterThanOrEqual(nodes_count - 1);

// Branching
const ifNode = workflow.nodes.find(n => n.type.includes('if'));
const ifConnections = workflow.connections[ifNode.name];
expect(ifConnections.main.length).toBeGreaterThanOrEqual(2);

// Parallel + Merge
const mergeNode = workflow.nodes.find(n => n.type.includes('merge'));
let incomingCount = 0;
for (const [nodeName, conns] of Object.entries(workflow.connections)) {
  if (conns.main.some(outputs =>
      outputs.some(conn => conn.node === mergeNode.name))) {
    incomingCount++;
  }
}
expect(incomingCount).toBeGreaterThanOrEqual(2);
```

## Debugging Failed Tests

### Enable Verbose Logging

```bash
NODE_OPTIONS='--experimental-vm-modules' jest --verbose
```

### Inspect N8N Instance

If tests fail due to N8N API issues:

1. Check N8N instance health: `curl $N8N_URL/healthz`
2. Verify API key: `curl -H "X-N8N-API-KEY: $N8N_API_KEY" $N8N_URL/api/v1/workflows`
3. Check N8N logs for errors

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in `jest.config.js` |
| 401 Unauthorized | Check `N8N_API_KEY` is valid |
| 404 Not Found | Verify `N8N_URL` is correct |
| Workflows not cleaned up | Check `afterAll` hook ran |
| Session store conflicts | Ensure `beforeEach` clears store |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      n8n:
        image: n8nio/n8n:latest
        ports:
          - 5678:5678
        env:
          N8N_BASIC_AUTH_ACTIVE: false

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install
      - run: npm run build

      - name: Run E2E Tests
        env:
          N8N_URL: http://localhost:5678
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
        run: npm run test:coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Maintenance

### Adding New Tests

1. Create fixture in `fixtures/` if needed
2. Add test file in appropriate directory
3. Follow naming convention: `*.test.ts`
4. Use `describe.skipIf(!RUN_E2E)` for E2E tests
5. Clean up created resources in `afterAll`
6. Update this README with new test counts

### Updating Expected Outcomes

When workflow schemas change:

1. Update fixtures in `fixtures/complex-scenarios.ts`
2. Update `EXPECTED_OUTCOMES` to match
3. Run tests to verify
4. Update documentation

## Related Documentation

- [MCP N8N Design Brief](../../docs/mcp-n8n-design.md)
- [Builder Pattern Spec](../../docs/builder-pattern.md)
- [N8N API Documentation](https://docs.n8n.io/api/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## License

MIT
