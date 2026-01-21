# MCP-N8N Test Plan

> **Date**: 2026-01-20
> **Version**: 1.2.0
> **Test Environment**: n8n.strangematic.com

---

## 1. Test Strategy

### 1.1 Test Pyramid

```
┌─────────────────────────────────────────────────────────────┐
│                   TEST PYRAMID                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                     E2E Tests (10%)                          │
│                 ▲                                            │
│                ╱ ╲                                           │
│               ╱   ╲                                          │
│              ╱     ╲                                         │
│             ╱       ╲                                        │
│            ╱─────────╲                                       │
│           ╱           ╲                                      │
│          ╱             ╲                                     │
│         ╱               ╲                                    │
│        ╱ Integration(30%)╲                                  │
│       ╱───────────────────╲                                 │
│      ╱                     ╲                                │
│     ╱                       ╲                               │
│    ╱                         ╲                              │
│   ╱     Unit Tests (60%)      ╲                             │
│  ╱─────────────────────────────╲                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Test Scope

| Test Level | Coverage Target | Priority |
|------------|-----------------|----------|
| Unit Tests | 80%+ | P0 |
| Integration Tests | Key workflows | P0 |
| E2E Tests | Happy path | P1 |
| Performance Tests | Response time | P1 |
| Security Tests | API key handling | P2 |

---

## 2. Unit Tests

### 2.1 WorkflowTransformer

**File**: `__tests__/services/workflow-transformer.test.ts`

```typescript
describe('WorkflowTransformer', () => {
  describe('transform()', () => {
    test('should transform simple webhook workflow', () => {
      // Input: SimplifiedWorkflow with webhook
      // Expected: N8N JSON with correct node type, typeVersion, position
    });

    test('should auto-generate node names', () => {
      // Input: Steps without names
      // Expected: Generated names "Webhook", "Postgres 2"
    });

    test('should auto-connect sequential steps', () => {
      // Input: 3 steps without explicit next
      // Expected: Connections: step1→step2, step2→step3
    });

    test('should resolve credentials', () => {
      // Input: credential="prod-db", credentialMap={prod-db: "123"}
      // Expected: Node has credentials.postgresApi.id = "123"
    });

    test('should throw on unknown node type', () => {
      // Input: type="foobar"
      // Expected: McpError with availableTypes in details
    });

    test('should throw on missing credential', () => {
      // Input: credential="missing", credentialMap={}
      // Expected: McpError with availableCredentials
    });

    test('should handle explicit next connections', () => {
      // Input: step with next=["Step A", "Step B"]
      // Expected: Connections to both targets
    });

    test('should assign correct typeVersion per node type', () => {
      // Input: Various node types
      // Expected: webhook=2, postgres=2, http=4, etc.
    });

    test('should merge default params with config', () => {
      // Input: webhook with custom config
      // Expected: Default httpMethod + custom path
    });

    test('should auto-position nodes horizontally', () => {
      // Input: 5 steps
      // Expected: positions [250,300], [450,300], [650,300]...
    });
  });

  describe('getCredentialType()', () => {
    test('should map common node types to credential types', () => {
      // Expected: postgres→postgresApi, discord→discordApi
    });
  });
});
```

**Coverage Target**: 100% (critical path)

---

### 2.2 N8NClient

**File**: `__tests__/services/n8n-client.test.ts`

```typescript
describe('N8NClient', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('listWorkflows()', () => {
    test('should build correct query params', async () => {
      // Input: {active: true, tags: "prod", limit: 10}
      // Expected: GET /workflows?active=true&tags=prod&limit=10
    });

    test('should handle pagination cursor', async () => {
      // Input: cursor from previous response
      // Expected: Included in query params
    });
  });

  describe('createWorkflow()', () => {
    test('should POST workflow JSON', async () => {
      // Input: Workflow object
      // Expected: POST /workflows with correct body
    });
  });

  describe('updateWorkflow()', () => {
    test('should PUT workflow JSON', async () => {
      // Input: workflow_id + updated workflow
      // Expected: PUT /workflows/{id}
    });
  });

  describe('error handling', () => {
    test('should throw McpError on 401', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      // Expected: McpError with statusCode 401
    });

    test('should throw McpError on timeout', async () => {
      // Setup: Mock timeout after 30s
      // Expected: McpError.TIMEOUT
    });

    test('should throw McpError on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      // Expected: McpError with network context
    });
  });
});
```

---

### 2.3 Tool Functions

**File**: `__tests__/tools/*.test.ts`

```typescript
describe('workflow_create', () => {
  test('should create workflow and return metadata', async () => {
    // Mock: N8NClient.createWorkflow()
    // Input: SimplifiedWorkflow
    // Expected: WorkflowCreateOutput with workflow_id, meta
  });

  test('should handle activation flag', async () => {
    // Input: activate=true
    // Expected: Created workflow is active
  });
});

describe('workflow_update', () => {
  test('Strategy 1: should replace with simplified schema', async () => {
    // Mock: getWorkflow(), updateWorkflow()
    // Input: workflow_id + SimplifiedWorkflow
    // Expected: Full workflow replaced
  });

  test('Strategy 2: should merge with workflow_json', async () => {
    // Input: workflow_id + workflow_json
    // Expected: Merged with current workflow
  });

  test('Strategy 3: should apply quick operations', async () => {
    // Input: activate=true, add_tags=["v2"]
    // Expected: Only those fields changed
  });

  test('should validate required fields', async () => {
    // Input: Missing name/nodes/connections
    // Expected: McpError.INVALID_PARAMS
  });
});

describe('execution_debug', () => {
  test('should parse node execution data', async () => {
    // Mock: N8NClient.getExecution()
    // Expected: NodeExecutionDebug[] with I/O samples
  });

  test('should calculate duration', async () => {
    // Mock: started_at, stopped_at
    // Expected: duration_ms calculated
  });

  test('should capture errors', async () => {
    // Mock: Node with error
    // Expected: error.message and error.stack in output
  });
});
```

---

## 3. Integration Tests

### 3.1 Transform Pipeline

**File**: `__tests__/integration/transform-pipeline.test.ts`

```typescript
describe('Transform Pipeline Integration', () => {
  test('should transform and create valid N8N workflow', async () => {
    // Input: SimplifiedWorkflow (webhook → postgres → respond)
    // Steps:
    //   1. Transform to N8N JSON
    //   2. Validate against N8N schema
    //   3. Create via API
    //   4. Fetch and verify
    // Expected: Workflow created successfully, nodes visible in UI
  });

  test('should handle all 10 node types', async () => {
    // Input: Workflow with all supported node types
    // Expected: All nodes created with correct typeVersion
  });
});
```

### 3.2 CRUD Workflow

**File**: `__tests__/integration/crud-workflow.test.ts`

```typescript
describe('CRUD Workflow Integration', () => {
  let workflowId: string;

  test('CREATE: should create workflow', async () => {
    const result = await workflowCreate(client, {
      workflow: simplifiedWorkflow,
      credentials: { 'prod-db': 'cred-123' }
    });
    workflowId = result.workflow_id;
    expect(workflowId).toBeDefined();
  });

  test('READ: should get workflow details', async () => {
    const result = await workflowGet(client, { workflow_id: workflowId });
    expect(result.name).toBe('Test Workflow');
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  test('UPDATE: should update workflow', async () => {
    const result = await workflowUpdate(client, {
      workflow_id: workflowId,
      activate: true
    });
    expect(result.active).toBe(true);
  });

  test('LIST: should find created workflow', async () => {
    const result = await workflowList(client, {
      name: 'Test Workflow'
    });
    const found = result.workflows.find(w => w.id === workflowId);
    expect(found).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup: Delete test workflow
    await client.deleteWorkflow(workflowId);
  });
});
```

### 3.3 Execution Debugging

**File**: `__tests__/integration/execution-debug.test.ts`

```typescript
describe('Execution Debugging Integration', () => {
  let workflowId: string;
  let executionId: string;

  beforeAll(async () => {
    // Create workflow and trigger execution
    workflowId = await createTestWorkflow();
    executionId = await triggerWorkflow(workflowId);
  });

  test('should list executions for workflow', async () => {
    const result = await executionList(client, { workflow_id: workflowId });
    expect(result.executions.length).toBeGreaterThan(0);
  });

  test('should debug execution with node details', async () => {
    const result = await executionDebug(client, {
      execution_id: executionId,
      include_data: 'all'
    });
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.nodes[0].executed).toBe(true);
  });
});
```

---

## 4. End-to-End Tests

### 4.1 Complete Development Loop

**File**: `__tests__/e2e/dev-loop.test.ts`

```typescript
describe('Development Loop E2E', () => {
  test('should support full create→test→debug→fix cycle', async () => {
    // 1. CREATE: Create simple workflow
    const createResult = await workflowCreate(client, {
      workflow: {
        name: 'E2E Test Workflow',
        steps: [
          { type: 'manual' },
          { type: 'code', config: { code: 'throw new Error("Test error")' } },
          { type: 'respond' }
        ]
      }
    });

    // 2. TEST: Trigger execution (manual via N8N UI)
    // Note: Requires manual trigger or separate trigger tool

    // 3. DEBUG: List executions
    const executions = await executionList(client, {
      workflow_id: createResult.workflow_id,
      status: 'error'
    });
    expect(executions.executions.length).toBeGreaterThan(0);

    // 4. DEBUG: Analyze error
    const debug = await executionDebug(client, {
      execution_id: executions.executions[0].id
    });
    const codeNode = debug.nodes.find(n => n.node_name.includes('Code'));
    expect(codeNode?.error).toBeDefined();
    expect(codeNode?.error?.message).toContain('Test error');

    // 5. FIX: Update workflow
    await workflowUpdate(client, {
      workflow_id: createResult.workflow_id,
      workflow: {
        name: 'E2E Test Workflow',
        steps: [
          { type: 'manual' },
          { type: 'code', config: { code: 'return items;' } },  // Fixed
          { type: 'respond' }
        ]
      }
    });

    // Cleanup
    await client.deleteWorkflow(createResult.workflow_id);
  });
});
```

---

## 5. Performance Tests

### 5.1 Response Time

**File**: `__tests__/performance/response-time.test.ts`

```typescript
describe('Performance Tests', () => {
  test('workflow_list should respond < 500ms', async () => {
    const start = Date.now();
    await workflowList(client, { limit: 10 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test('workflow_create should respond < 1000ms', async () => {
    const start = Date.now();
    await workflowCreate(client, { workflow: simpleWorkflow });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  test('execution_debug should respond < 1000ms', async () => {
    const start = Date.now();
    await executionDebug(client, { execution_id: 'test-exec-id' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 6. Test Execution Plan

### 6.1 Local Development

```bash
# Run all unit tests
npm test

# Run specific test suite
npm test -- workflow-transformer

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### 6.2 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test -- --coverage
      - run: npm run build

  integration:
    runs-on: ubuntu-latest
    services:
      n8n:
        image: n8nio/n8n:latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:integration
```

### 6.3 Pre-Production

```bash
# Run against staging N8N instance
N8N_URL=https://n8n-staging.strangematic.com npm run test:integration

# Performance benchmarks
npm run test:performance
```

---

## 7. Test Data

### 7.1 Fixture Workflows

**File**: `__tests__/fixtures/workflows.ts`

```typescript
export const SIMPLE_WEBHOOK_WORKFLOW: SimplifiedWorkflow = {
  name: 'Simple Webhook Test',
  steps: [
    { type: 'webhook', config: { path: '/test' } },
    { type: 'respond', config: { statusCode: 200 } }
  ]
};

export const POSTGRES_WORKFLOW: SimplifiedWorkflow = {
  name: 'PostgreSQL Test',
  steps: [
    { type: 'manual' },
    { type: 'postgres', credential: 'test-db', config: { operation: 'select' } },
    { type: 'respond' }
  ]
};

export const COMPLEX_WORKFLOW: SimplifiedWorkflow = {
  name: 'Complex Branching Test',
  steps: [
    { type: 'webhook', name: 'Start' },
    { type: 'if', name: 'Check', next: ['Success', 'Error'] },
    { type: 'respond', name: 'Success' },
    { type: 'respond', name: 'Error' }
  ]
};
```

### 7.2 Mock Responses

**File**: `__tests__/mocks/n8n-api.ts`

```typescript
export const MOCK_WORKFLOW_RESPONSE = {
  id: 'wf-123',
  name: 'Test Workflow',
  active: false,
  nodes: [...],
  connections: {...},
  createdAt: '2026-01-20T10:00:00Z',
  updatedAt: '2026-01-20T10:00:00Z'
};

export const MOCK_EXECUTION_RESPONSE = {
  id: 'exec-456',
  finished: true,
  mode: 'manual',
  startedAt: '2026-01-20T10:00:00Z',
  stoppedAt: '2026-01-20T10:00:05Z',
  data: {
    resultData: {
      runData: {...}
    }
  }
};
```

---

## 8. Test Checklist

### Before Commit

- [ ] All unit tests pass
- [ ] Code coverage >80%
- [ ] No TypeScript errors
- [ ] Build succeeds

### Before Merge

- [ ] Integration tests pass
- [ ] Code review complete
- [ ] Documentation updated

### Before Release

- [ ] E2E tests pass
- [ ] Performance benchmarks met
- [ ] Manual testing on staging
- [ ] Changelog updated

---

## 9. Test Metrics

### Current Status

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Unit Test Coverage | 80% | 0% | ❌ |
| Integration Tests | 10+ | 0 | ❌ |
| E2E Tests | 3+ | 0 | ❌ |
| Performance Tests | 5+ | 0 | ❌ |

### Target Timeline

| Milestone | Date | Tests |
|-----------|------|-------|
| Phase 1 | Week 1 | Unit tests (60% coverage) |
| Phase 2 | Week 2 | Integration tests (CRUD) |
| Phase 3 | Week 3 | E2E + Performance |
| Complete | Week 4 | 80%+ coverage, all tests green |

---

## 10. Next Steps

1. **Setup Jest** - Install and configure testing framework
2. **Write unit tests** - Start with WorkflowTransformer (critical path)
3. **Add integration tests** - Test against local N8N instance
4. **Setup CI/CD** - GitHub Actions for automated testing
5. **Performance baseline** - Measure current response times

---

**Conclusion**: Comprehensive test plan covering unit, integration, E2E, and performance testing. Priority is establishing unit test foundation (80% coverage) before adding higher-level tests. Estimated 4 weeks to complete full test suite.
