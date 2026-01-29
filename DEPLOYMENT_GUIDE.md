# MCP N8N v1.4.0 - Note CRUD Complete Deployment Guide

## Executive Summary

**Version**: 1.4.0
**Features**: Note CRUD (Phase 1 + 1.5 + 2)
**Status**: Ready for deployment
**Estimated Deploy Time**: 15-20 minutes

### What's New

- **Phase 1**: Note CRUD helpers with templates (changelog, usage, architecture)
- **Phase 1.5**: MCP tools exposure (note_create, note_update, note_delete)
- **Phase 2**: Builder pattern extension (stickyNote support)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Testing Strategy](#testing-strategy)
3. [Integration Testing](#integration-testing)
4. [Deployment Steps](#deployment-steps)
5. [UAT Scenarios](#uat-scenarios)
6. [Rollback Plan](#rollback-plan)
7. [Monitoring & Validation](#monitoring--validation)

---

## Pre-Deployment Checklist

### Code Readiness

- [x] **Phase 1**: Helpers implemented (`src/helpers/note-crud.ts`)
- [x] **Phase 1**: Templates created (3 files in `/templates/`)
- [x] **Phase 1.5**: MCP tools created (3 files in `/src/tools/`)
- [x] **Phase 1.5**: Server integration complete (tool definitions + handlers)
- [x] **Phase 2**: Node mappings extended (stickyNote added)
- [x] **Phase 2**: Builder pattern extended (template support)
- [x] **Phase 2**: Knowledge layer schema added (13 schemas total)

### Environment Readiness

- [ ] Docker installed and running
- [ ] GitHub token available (`GITHUB_TOKEN` env var)
- [ ] N8N instance accessible
- [ ] PostgreSQL database accessible (for context manager)
- [ ] Server has sufficient resources (2GB RAM minimum)

### Backup Checklist

- [ ] Backup current N8N workflows (via API or export)
- [ ] Backup PostgreSQL `agent` schema (context data)
- [ ] Tag current Docker image: `docker tag strange-mcp-n8n:latest strange-mcp-n8n:v1.3.1-backup`
- [ ] Document current running version

---

## Testing Strategy

### Test Pyramid

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST PYRAMID                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      E2E (10%)                               │
│                  Full workflow tests                          │
│                 /              \                             │
│                /  Integration   \                            │
│               /     (30%)        \                           │
│              /   Tool + Helper    \                          │
│             /______________________ \                        │
│            /                         \                       │
│           /      Unit Tests (60%)     \                      │
│          /   Helpers, Templates, Fns   \                     │
│         /__________________________________\                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Coverage Targets

| Component | Target Coverage | Status |
|-----------|----------------|--------|
| Helpers (`note-crud.ts`) | 80% | Pending |
| Templates | 100% | Pending |
| MCP Tools | 80% | Pending |
| Builder Extension | 80% | Pending |
| Schema Validation | 90% | Pending |

### Test Plan

#### Unit Tests (60% of effort)

**File**: `__tests__/unit/helpers/note-crud.test.ts`

```typescript
describe('Note CRUD Helpers', () => {
  describe('createNote()', () => {
    test('should create note with default size');
    test('should create note with custom size');
    test('should create note with template');
    test('should position note automatically');
    test('should throw on invalid workflow ID');
  });

  describe('updateNote()', () => {
    test('should update content only');
    test('should update size only');
    test('should update both content and size');
    test('should throw if note not found');
  });

  describe('deleteNote()', () => {
    test('should delete existing note');
    test('should throw if note not found');
  });

  describe('loadTemplate()', () => {
    test('should load changelog template');
    test('should load usage template');
    test('should load architecture template');
    test('should throw on unknown template');
  });

  describe('fillTemplate()', () => {
    test('should substitute all variables');
    test('should handle missing variables');
    test('should preserve non-variable text');
  });
});
```

**File**: `__tests__/unit/tools/note-tools.test.ts`

```typescript
describe('Note MCP Tools', () => {
  let mockClient: jest.Mocked<N8NClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('noteCreate()', () => {
    test('should create note with template');
    test('should create note with direct content');
    test('should return note metadata');
    test('should throw if neither template nor content');
  });

  describe('noteUpdate()', () => {
    test('should update content');
    test('should update dimensions');
    test('should return updated note info');
  });

  describe('noteDelete()', () => {
    test('should delete note and confirm');
    test('should throw if note not found');
  });
});
```

#### Integration Tests (30% of effort)

**File**: `__tests__/integration/note-workflow.test.ts`

```typescript
describe('Note CRUD Integration', () => {
  const client = new N8NClient(process.env.N8N_URL!, process.env.N8N_API_KEY!);
  let workflowId: string;
  let noteId: string;

  afterAll(async () => {
    if (workflowId) {
      await client.deleteWorkflow(workflowId);
    }
  });

  test('CREATE workflow with documentation note', async () => {
    const result = await workflowCreate(client, {
      workflow: {
        name: 'Test Workflow with Note',
        steps: [{ type: 'manual' }],
      },
    });
    workflowId = result.workflow_id;

    const noteResult = await noteCreate(client, {
      workflow_id: workflowId,
      template: 'changelog',
      template_variables: {
        workflow_name: 'Test Workflow',
        created_date: '2026-01-29',
        version: '1.0.0',
        date: '2026-01-29',
        change_description: 'Initial version',
        author: 'Test',
        reason: 'Testing',
      },
    });

    expect(noteResult.success).toBe(true);
    noteId = noteResult.note.id;
  });

  test('READ workflow should include note', async () => {
    const workflow = await workflowGet(client, { workflow_id: workflowId });

    const note = workflow.nodes.find(n => n.type === 'n8n-nodes-base.stickyNote');
    expect(note).toBeDefined();
    expect(note!.parameters.content).toContain('Changelog');
  });

  test('UPDATE note content', async () => {
    const result = await noteUpdate(client, {
      workflow_id: workflowId,
      note_name: 'Note',
      content: '## Updated\n\nContent changed.',
    });

    expect(result.success).toBe(true);
  });

  test('DELETE note from workflow', async () => {
    const result = await noteDelete(client, {
      workflow_id: workflowId,
      note_name: 'Note',
    });

    expect(result.success).toBe(true);

    const workflow = await workflowGet(client, { workflow_id: workflowId });
    const note = workflow.nodes.find(n => n.type === 'n8n-nodes-base.stickyNote');
    expect(note).toBeUndefined();
  });
});
```

**File**: `__tests__/integration/builder-notes.test.ts`

```typescript
describe('Builder Pattern with Notes', () => {
  let sessionId: string;

  afterEach(async () => {
    if (sessionId) {
      await builderDiscard({ session_id: sessionId });
    }
  });

  test('should create workflow with notes via builder', async () => {
    // Start session
    const session = await builderStart({
      name: 'Documented Workflow',
    });
    sessionId = session.session_id;

    // Add trigger
    await builderAddNode({
      session_id: sessionId,
      node: { type: 'manual' },
    });

    // Add note
    const noteResult = await builderAddNode({
      session_id: sessionId,
      node: {
        type: 'stickyNote',
        config: {
          content: '## Test Note',
        },
      },
    });

    expect(noteResult.success).toBe(true);
    expect(noteResult.nodes_count).toBe(2);

    // Commit workflow
    const commitResult = await builderCommit({
      session_id: sessionId,
      activate: false,
    });

    expect(commitResult.success).toBe(true);

    // Cleanup
    await client.deleteWorkflow(commitResult.workflow.id);
  });

  test('should expand template in builder', async () => {
    const session = await builderStart({ name: 'Template Test' });
    sessionId = session.session_id;

    const result = await builderAddNode({
      session_id: sessionId,
      node: {
        type: 'stickyNote',
        config: {
          template: 'usage',
          template_variables: {
            workflow_name: 'Test',
            trigger_type: 'Manual',
            trigger_config: 'None',
            input_format: 'Any',
            output_format: 'JSON',
            error_handling: '500 on error',
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });
});
```

#### E2E Tests (10% of effort)

**File**: `__tests__/e2e/documented-workflow.test.ts`

```typescript
describe('Full Documented Workflow E2E', () => {
  test('should create, document, execute, and cleanup workflow', async () => {
    // 1. CREATE workflow with documentation
    // 2. ADD nodes and notes
    // 3. EXECUTE workflow (if has webhook trigger)
    // 4. UPDATE notes based on execution results
    // 5. CLEANUP
  });
});
```

---

## Integration Testing

### Manual Integration Tests

#### Test 1: Direct Tool Usage

```bash
# Start MCP server (local mode)
cd /home/strange/projects/strange-mcp-n8n
npm run dev

# In separate terminal, use MCP client to call tools
# (Or test via Claude Desktop MCP integration)

# Test note_create
{
  "tool": "note_create",
  "input": {
    "workflow_id": "pdIZKbTQ0EdjzxqM",
    "template": "changelog",
    "template_variables": {
      "workflow_name": "Test Workflow",
      "created_date": "2026-01-29",
      "version": "1.0.0",
      "date": "2026-01-29",
      "change_description": "Added note CRUD support",
      "author": "Dev Team",
      "reason": "Feature complete"
    }
  }
}

# Test note_update
{
  "tool": "note_update",
  "input": {
    "workflow_id": "pdIZKbTQ0EdjzxqM",
    "note_name": "Note",
    "content": "## Updated Content"
  }
}

# Test note_delete
{
  "tool": "note_delete",
  "input": {
    "workflow_id": "pdIZKbTQ0EdjzxqM",
    "note_name": "Note"
  }
}
```

#### Test 2: Builder Pattern

```bash
# Test builder with stickyNote

# 1. Start session
{
  "tool": "builder_start",
  "input": {
    "name": "Documented Workflow Test"
  }
}

# 2. Add note
{
  "tool": "builder_add_node",
  "input": {
    "session_id": "<session_id>",
    "node": {
      "type": "stickyNote",
      "config": {
        "content": "## Workflow Documentation\n\nThis workflow demonstrates note support."
      }
    }
  }
}

# 3. Commit
{
  "tool": "builder_commit",
  "input": {
    "session_id": "<session_id>"
  }
}
```

#### Test 3: Schema Validation

```bash
# Verify stickyNote schema loaded
{
  "tool": "schema_discover",
  "input": {}
}

# Should show 13 schemas including stickyNote

# Get schema details
{
  "tool": "schema_get",
  "input": {
    "nodeType": "stickyNote"
  }
}

# Should return complete schema with structure and examples
```

---

## Deployment Steps

### Step 1: Pre-Deployment Validation

```bash
cd /home/strange/projects/strange-mcp-n8n

# 1. Verify all files exist
ls -la src/helpers/note-crud.ts
ls -la src/tools/note-create.ts
ls -la src/tools/note-update.ts
ls -la src/tools/note-delete.ts
ls -la src/knowledge/schemas/stickynote-node.ts
ls -la templates/note-*.md

# 2. Check git status (optional)
git status
git diff

# 3. Review changed files
# - src/schemas/node-mappings.ts
# - src/tools/builder-add-node.ts
# - src/knowledge/core/registry.ts
# - src/knowledge/index.ts
# - src/server.ts
```

### Step 2: Docker Build

```bash
# Set environment
export GITHUB_TOKEN=<your-github-token>
export DOCKER_BUILDKIT=1

# Clean old build artifacts (optional)
docker compose down
docker image prune -f

# Build image (no cache to ensure fresh build)
docker compose build --no-cache

# Expected output:
# - Building image from Dockerfile
# - npm install pulls @trangpl193/mcp-core from GitHub Packages
# - TypeScript compilation completes
# - Multi-stage build creates runner image
# - Health check configured
```

### Step 3: Deploy Container

```bash
# Start service
docker compose up -d

# Wait for startup (check logs)
docker compose logs -f mcp-n8n

# Expected logs:
# "✅ Knowledge Layer initialized: 13 schemas, 1 quirk registered"
# "N8N MCP Server running on stdio"
```

### Step 4: Verify Health

```bash
# Check container status
docker compose ps

# Should show:
# - Container: running
# - Health: healthy

# Check health endpoint (if exposed via HTTP)
curl http://localhost:3302/health

# Expected: {"status": "ok", "version": "1.4.0"}
```

### Step 5: Verify Tools Available

```bash
# Connect MCP client and list tools
# Should include:
# - note_create
# - note_update
# - note_delete
# - builder_add_node (with stickyNote support)
# - schema_get (with stickyNote schema)
```

---

## UAT Scenarios

### Scenario 1: Create Documented Workflow

**Objective**: Verify AI agent can create workflow with documentation notes

**Steps**:
1. User: "Create a webhook workflow that logs requests, and add a changelog note"
2. AI should:
   - Use builder_start
   - Add webhook node
   - Add code/log node
   - Add stickyNote with changelog template
   - Connect nodes
   - Commit workflow
3. Verify in N8N UI:
   - Workflow created
   - Sticky note visible
   - Content formatted correctly

**Success Criteria**:
- Workflow executes successfully
- Note displays in canvas
- Template variables substituted

### Scenario 2: Update Existing Workflow Documentation

**Objective**: Verify note_update tool works

**Steps**:
1. User: "Update the changelog in workflow X to add version 1.1.0"
2. AI should:
   - Use note_update tool
   - Append new version entry
3. Verify in N8N UI:
   - Note content updated
   - Original content preserved
   - New content appended

**Success Criteria**:
- Note updated without errors
- Content correctly merged
- No workflow disruption

### Scenario 3: Builder Pattern with Mixed Nodes

**Objective**: Verify builder handles notes + regular nodes

**Steps**:
1. User: "Build a workflow with webhook, postgres query, and usage documentation"
2. AI should:
   - Start builder session
   - Add webhook
   - Add stickyNote (usage template)
   - Add postgres
   - Add stickyNote (architecture note)
   - Connect webhook → postgres
   - Commit
3. Verify:
   - All 4 nodes created
   - Notes not connected
   - Workflow functional

**Success Criteria**:
- Builder session completes
- Mixed node types handled
- Notes positioned correctly

### Scenario 4: Schema Validation

**Objective**: Verify schema validation catches errors

**Steps**:
1. User: "Add a note with empty content"
2. AI should receive validation error
3. AI should correct and retry

**Success Criteria**:
- Validation error caught
- Error message helpful
- Retry succeeds

### Scenario 5: Template Expansion

**Objective**: Verify all 3 templates work

**Steps**:
1. Test changelog template
2. Test usage template
3. Test architecture template

**Success Criteria**:
- All templates load
- Variables substitute correctly
- Markdown formatting preserved

---

## Rollback Plan

### If Deployment Fails

#### Option 1: Rollback Docker Image

```bash
# Stop current version
docker compose down

# Revert to backup
docker tag strange-mcp-n8n:v1.3.1-backup strange-mcp-n8n:latest

# Restart
docker compose up -d

# Verify
docker compose logs -f mcp-n8n
```

#### Option 2: Rollback Code Changes

```bash
# If using git
git revert HEAD~5  # Revert last 5 commits (adjust as needed)
git push

# Rebuild
docker compose build --no-cache
docker compose up -d
```

#### Option 3: Disable Note Features

```typescript
// In server.ts, comment out note tool definitions
// In builder-add-node.ts, remove 'stickyNote' from supported_types
// Rebuild

# This leaves Phase 1 helpers intact for future use
```

### Data Recovery

```bash
# Restore N8N workflows from backup
# (If workflows were corrupted during testing)

# Restore PostgreSQL context data
psql -U postgres -d apps -f backup/agent_schema_backup.sql
```

---

## Monitoring & Validation

### Post-Deployment Checks

#### Check 1: Schema Count

```bash
# Check logs for schema count
docker compose logs mcp-n8n | grep "Knowledge Layer"

# Expected: "✅ Knowledge Layer initialized: 13 schemas, 1 quirk registered"
```

#### Check 2: Tool Registration

```bash
# Via MCP client, list tools
# Expected to see:
# - note_create
# - note_update
# - note_delete
# - All existing tools still present
```

#### Check 3: Builder Functionality

```bash
# Test builder_add_node with each type
# Ensure all existing node types still work
# Verify stickyNote is new addition
```

#### Check 4: Performance

```bash
# Measure response times
# - builder_add_node: < 200ms
# - note_create: < 300ms
# - note_update: < 200ms
# - note_delete: < 150ms
```

### Ongoing Monitoring

```bash
# Watch logs for errors
docker compose logs -f mcp-n8n | grep -i error

# Monitor resource usage
docker stats mcp-n8n

# Expected:
# - CPU: < 5% idle, < 50% under load
# - Memory: < 500MB
```

### Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Deployment Time | < 20 min | Time from build to verified |
| Tool Availability | 100% | All tools respond |
| Schema Load Time | < 500ms | Server startup logs |
| Note Creation Time | < 300ms | Tool execution time |
| Error Rate | < 1% | Logs after 24h |
| UAT Pass Rate | 100% | All scenarios pass |

---

## Appendix

### A. Environment Variables

```bash
# Required
GITHUB_TOKEN=ghp_...              # For npm install
N8N_URL=https://n8n.strangematic.com
N8N_API_KEY=...                   # For API access

# Optional
NODE_ENV=production               # production|development
LOG_LEVEL=info                    # debug|info|warn|error
MCP_PORT=3302                     # Default port
```

### B. Docker Compose Reference

```yaml
services:
  mcp-n8n:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        GITHUB_TOKEN: ${GITHUB_TOKEN}
    image: strange-mcp-n8n:latest
    container_name: strange-mcp-n8n
    restart: unless-stopped
    ports:
      - "3302:3302"
    environment:
      - NODE_ENV=production
      - N8N_URL=${N8N_URL}
      - N8N_API_KEY=${N8N_API_KEY}
    healthcheck:
      interval: 30s
      timeout: 10s
      start_period: 40s
      retries: 3
```

### C. Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Build fails with 401 | Missing GITHUB_TOKEN | Export token before build |
| Schema count = 12 | stickyNote not loaded | Check registry.ts import |
| note_create not found | Server not registered | Check server.ts tool definitions |
| Template not found | Missing template file | Verify templates/ directory |
| Validation fails | Schema format error | Check stickynote-node.ts structure |

### D. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.3.1 | 2026-01-28 | UAT Complete + Critical Bugs Fixed |
| 1.4.0 | 2026-01-29 | Note CRUD Complete (Phase 1+1.5+2) |

---

## Summary

This guide covers the complete deployment lifecycle for MCP N8N v1.4.0 with Note CRUD features:

✅ **Testing**: Unit, Integration, E2E strategies defined
✅ **Integration**: Manual test procedures documented
✅ **Deployment**: 5-step process with validation
✅ **UAT**: 5 scenarios covering all capabilities
✅ **Rollback**: 3 recovery options documented
✅ **Monitoring**: Metrics and health checks defined

**Estimated Total Time**:
- Testing: 4-6 hours
- Deployment: 15-20 minutes
- UAT: 1-2 hours
- **Total**: 6-9 hours for complete cycle

**Ready for Deployment**: ✅ YES
