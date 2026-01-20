# strange-mcp-n8n

MCP server for N8N workflow development and operations.

## Features

- **Workflow Management**: Create, read, update workflows
- **Execution Debugging**: Node-level I/O analysis with AI-friendly summaries
- **Simplified Schema**: Reduced token usage with transform layer
- **Error Handling**: AI-readable errors with recovery hints

## Installation

```bash
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
export N8N_URL="https://your-n8n-instance.com"
export N8N_API_KEY="your-api-key"
export N8N_TIMEOUT="30000"  # Optional, default 30000ms
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

### Available Tools (Phase 1)

#### workflow_list ✅

List workflows with filtering.

```typescript
{
  active?: boolean,
  tags?: string,
  name?: string,
  limit?: number,
  cursor?: string
}
```

**Status**: Working - Tested with N8N instance

**Note**: `credential_list` tool removed - N8N Public API does not support listing credentials (no GET endpoint available).

## Development

```bash
npm run dev     # Watch mode
npm run build   # Production build
npm test        # Run tests
```

## Architecture

```
src/
├── tools/          # MCP tool implementations
├── services/       # N8N client, transformers
├── schemas/        # Simplified workflow schemas (Phase 2)
├── server.ts       # MCP server
└── index.ts        # Entry point
```

## Roadmap

- [x] Phase 1: Foundation (workflow_list, credential_list)
- [ ] Phase 2: Transform Layer (workflow_create)
- [ ] Phase 3: Debugging (execution_debug)
- [ ] Phase 4: Update Loop (workflow_update)
- [ ] Phase 5: Deployment (Docker, CF Tunnel)

## License

MIT
