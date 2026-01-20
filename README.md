# strange-mcp-n8n

MCP server for N8N workflow development and operations. Development-first MVP optimized for the create → test → debug → fix cycle.

## Features

### Simplified Workflow Creation
- **AI-friendly input schema** - 10% token usage vs full N8N JSON
- **Automatic transformations** - Node IDs, positioning, connections
- **Credential resolution** - Name → ID mapping with validation
- **10 node types supported** - webhook, postgres, http, discord, respond, if, switch, merge, set, code

### Execution Debugging
- **Node-level I/O inspection** - See input/output data for each node
- **Error tracking** - Stack traces and error messages
- **Performance metrics** - Execution timing per node
- **Status filtering** - success, error, running, waiting

## Installation

```bash
npm install
npm run build
```

## Configuration

Create `.env` file:

```env
N8N_URL=https://n8n.strangematic.com
N8N_API_KEY=your-api-key-here
```

## Usage

### MCP Configuration

Add to your MCP client config (e.g., Claude Code):

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/path/to/strange-mcp-n8n/dist/index.js"],
      "env": {
        "N8N_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Available Tools (6 total)

#### 1. workflow_list ✅
List N8N workflows with filtering.

#### 2. workflow_create ✅
Create N8N workflow from simplified schema.

#### 3. workflow_get ✅
Get workflow details by ID.

#### 4. workflow_update ✅
Update existing N8N workflow (3 strategies: full replacement, direct JSON, quick operations).

#### 5. execution_list ✅
List workflow executions with filtering.

#### 6. execution_debug ✅
Get detailed execution debug information.

See full API documentation below.

## Simplified Workflow Schema

### Supported Node Types

| Type | N8N Type | Category |
|------|----------|----------|
| `webhook` | n8n-nodes-base.webhook | trigger |
| `schedule` | n8n-nodes-base.scheduleTrigger | trigger |
| `manual` | n8n-nodes-base.manualTrigger | trigger |
| `http` | n8n-nodes-base.httpRequest | action |
| `postgres` | n8n-nodes-base.postgres | action |
| `discord` | n8n-nodes-base.discord | action |
| `respond` | n8n-nodes-base.respondToWebhook | action |
| `if` | n8n-nodes-base.if | logic |
| `switch` | n8n-nodes-base.switch | logic |
| `merge` | n8n-nodes-base.merge | logic |
| `set` | n8n-nodes-base.set | transform |
| `code` | n8n-nodes-base.code | transform |

### Example: Simple Webhook Workflow

```json
{
  "name": "Figma Export",
  "steps": [
    {
      "type": "webhook",
      "config": {
        "path": "/figma-export",
        "httpMethod": "POST"
      }
    },
    {
      "type": "postgres",
      "credential": "prod-db",
      "config": {
        "operation": "insert",
        "table": "figma_variables"
      }
    },
    {
      "type": "respond",
      "config": {
        "statusCode": 200
      }
    }
  ]
}
```

## API Reference

### workflow_create

**Input:**
```json
{
  "workflow": {
    "name": "Export Figma Variables",
    "steps": [...]
  },
  "credentials": {
    "prod-db": "cred-12345"
  },
  "activate": false
}
```

**Output:**
```json
{
  "workflow_id": "wf-789",
  "name": "Export Figma Variables",
  "active": false,
  "nodes_count": 3,
  "created_at": "2026-01-20T10:00:00Z",
  "meta": {
    "execution_time_ms": 250,
    "rows_affected": 1
  }
}
```

### workflow_update

Update existing workflow using one of three strategies:

**Strategy 1: Full replacement with simplified schema**
```json
{
  "workflow_id": "wf-123",
  "workflow": {
    "name": "Updated Export Figma Variables",
    "steps": [...]
  },
  "credentials": {
    "prod-db": "cred-12345"
  }
}
```

**Strategy 2: Direct N8N JSON update (advanced)**
```json
{
  "workflow_id": "wf-123",
  "workflow_json": {
    "name": "Updated Name",
    "nodes": [...],
    "connections": {...}
  }
}
```

**Strategy 3: Quick operations**
```json
{
  "workflow_id": "wf-123",
  "activate": true,
  "rename": "New Name",
  "add_tags": ["production", "v2"],
  "remove_tags": ["staging"]
}
```

**Output:**
```json
{
  "workflow_id": "wf-123",
  "name": "Updated Export Figma Variables",
  "active": true,
  "nodes_count": 4,
  "updated_at": "2026-01-20T15:00:00Z",
  "meta": {
    "execution_time_ms": 320,
    "rows_affected": 1
  }
}
```

### execution_debug

**Input:**
```json
{
  "execution_id": "exec-456",
  "include_data": "all"
}
```

**Output:**
```json
{
  "execution_id": "exec-456",
  "workflow_id": "wf-123",
  "status": "error",
  "duration_ms": 5000,
  "nodes": [
    {
      "node_name": "PostgreSQL",
      "executed": true,
      "execution_time_ms": 4950,
      "input_items_count": 1,
      "output_items_count": 0,
      "error": {
        "message": "duplicate key value violates unique constraint"
      }
    }
  ]
}
```

## Architecture

### Transform Layer

```
SimplifiedWorkflow → WorkflowTransformer → N8N JSON
                            ↓
                    Credential Resolution
                    Node ID Generation (UUID)
                    Auto-positioning (horizontal)
                    Connection Generation
```

### Error Handling

Uses `@strange/mcp-core` for structured errors:
- **McpErrorCode.INVALID_PARAMS** - Invalid node type or missing credential
- **McpErrorCode.BAD_REQUEST** - Malformed input
- **McpErrorCode.TOOL_EXECUTION_FAILED** - N8N API error

## Development

```bash
npm run dev        # Watch mode
npm run build      # Production build
npm run typecheck  # Type checking
```

## Version History

### v1.2.0 (2026-01-20)
- ✅ Phase 4: Workflow update loop
- ✅ workflow_update - Three update strategies
- ✅ Strategy 1: Full replacement with simplified schema
- ✅ Strategy 2: Direct N8N JSON update
- ✅ Strategy 3: Quick operations (activate, rename, tags)
- Bundle size: 30.40 KB

### v1.1.0 (2026-01-20)
- ✅ Phase 3: Execution debugging tools
- ✅ execution_list - Filter and list executions
- ✅ execution_debug - Node-level I/O and errors
- Bundle size: 25.66 KB

### v1.0.0 (2026-01-20)
- ✅ Phase 1: Basic workflow listing
- ✅ Phase 2: Transform layer and creation
- ✅ workflow_list, workflow_create, workflow_get
- Bundle size: 20.42 KB

## Roadmap

- [x] Phase 1: Foundation (workflow_list)
- [x] Phase 2: Transform Layer (workflow_create, workflow_get)
- [x] Phase 3: Debugging (execution_list, execution_debug)
- [x] Phase 4: Update Loop (workflow_update)
- [ ] Phase 5: Deployment (Docker, Cloudflare)

## License

MIT
