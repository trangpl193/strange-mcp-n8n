# MCP N8N Deployment Summary

**Date**: 2026-01-20
**Status**: Ready for deployment - requires N8N API key and Cloudflare Tunnel setup

## Deployment Progress

### ✅ Completed

1. **Production Build**
   - Built strange-mcp-n8n v1.2.0 with Streamable HTTP transport
   - Test coverage: 88.33% (45 tests passing)
   - Entry points: `dist/index.js` (stdio), `dist/cli-sdk.js` (HTTP)

2. **Docker Configuration**
   - Created Dockerfile (multi-stage build with mcp-core dependency)
   - Created docker-compose.yml (port 3302, selfhost_internal network)
   - Built Docker image: `strange-mcp-n8n:latest`

3. **MCP Configuration**
   - Updated server-side config: `/home/strange/.mcp.json`
   - Updated client-side config: `/home/strange/projects/figma-strange/.mcp.json`
   - Port: 3302 (local), https://mcp-n8n.strangematic.com (via CF Tunnel)

### 🔲 Pending

4. **Environment Variables**
   - Create `.env` file with:
     - `N8N_URL=https://n8n.strangematic.com`
     - `N8N_API_KEY=` ⚠️ **TODO: Get from N8N settings**
     - `MCP_API_KEY=mcp_a38e0558e20d832ad0c0c48eec5434f3`

5. **Deployment**
   - Option A: Docker Compose (recommended)
     ```bash
     cd /home/strange/projects/strange-mcp-n8n
     docker-compose up -d
     ```
   - Option B: Docker run
     ```bash
     docker run -d \
       --name strange-mcp-n8n-server \
       --network selfhost_internal \
       -p 3302:3302 \
       -e N8N_URL=https://n8n.strangematic.com \
       -e N8N_API_KEY=xxx \
       -e MCP_API_KEY=mcp_a38e0558e20d832ad0c0c48eec5434f3 \
       strange-mcp-n8n:latest
     ```

6. **Cloudflare Tunnel**
   - Create tunnel: `mcp-n8n.strangematic.com` → `http://localhost:3302`
   - Add CF Access policy (same service token as mcp-postgres)
   - Test external access via figma-strange project

7. **UAT Testing**
   - Server-side: `claude code` from `/home/strange`
   - Client-side: `claude code` from figma-strange project
   - Test all 6 tools:
     - `workflow_list`, `workflow_get`, `workflow_create`
     - `workflow_update`, `execution_list`, `execution_debug`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Internet)                                          │
│  figma-strange/.mcp.json                                    │
│  → https://mcp-n8n.strangematic.com/mcp                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ CF Tunnel + CF Access
┌──────────────────────┴──────────────────────────────────────┐
│  Server (selfhost)                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  strange-mcp-n8n-server (Docker)                       │ │
│  │  Port: 3302                                            │ │
│  │  Network: selfhost_internal                            │ │
│  │  ├─ MCP Server (Streamable HTTP)                       │ │
│  │  ├─ N8N Client → https://n8n.strangematic.com          │ │
│  │  └─ 6 Tools (workflow + execution management)          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tools Available

### Workflow Management
1. **workflow_list** - List workflows with filtering
2. **workflow_get** - Get workflow details
3. **workflow_create** - Create from simplified schema
4. **workflow_update** - Update workflow (full definition)

### Execution Management
5. **execution_list** - List executions with filtering
6. **execution_debug** - Get node-level debug data

## File Locations

- **Project**: `/home/strange/projects/strange-mcp-n8n/`
- **Docker Image**: `strange-mcp-n8n:latest`
- **Server Config**: `/home/strange/.mcp.json`
- **Client Config**: `/home/strange/projects/figma-strange/.mcp.json`
- **Dockerfile**: `/home/strange/projects/strange-mcp-n8n/Dockerfile`
- **Docker Compose**: `/home/strange/projects/strange-mcp-n8n/docker-compose.yml`

## Next Steps

1. Get N8N API Key from https://n8n.strangematic.com/settings
2. Create `.env` file with actual API keys
3. Deploy with `docker-compose up -d`
4. Verify health: `curl http://localhost:3302/health`
5. Setup Cloudflare Tunnel (mcp-n8n.strangematic.com)
6. Run UAT from both server and client
7. Update session context in database

## Version Info

- **Package**: strange-mcp-n8n@1.2.0
- **Transport**: Streamable HTTP (Official SDK)
- **MCP Core**: @strange/mcp-core@1.1.0
- **Node**: 20-alpine
- **Tests**: 45 passing, 88.33% coverage
