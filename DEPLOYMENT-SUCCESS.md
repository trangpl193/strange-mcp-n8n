# MCP N8N Deployment - SUCCESSFUL ✅

**Date**: 2026-01-20
**Status**: ✅ Deployed and Running
**Container**: `strange-mcp-n8n-server` (healthy)
**Port**: 3302

## Deployment Summary

### ✅ Successfully Deployed

1. **Container Status**: ✅ HEALTHY
   ```
   Container ID: 77cf560935e1
   Status: Up 18 seconds (healthy)
   Port: 0.0.0.0:3302->3302/tcp
   ```

2. **Health Check**: ✅ PASSING
   ```json
   {
     "status": "healthy",
     "service": "strange-mcp-n8n",
     "version": "1.2.0",
     "transport": "streamable-http",
     "timestamp": "2026-01-20T15:18:19.985Z"
   }
   ```

3. **Server Logs**: ✅ NO ERRORS
   ```
   🚀 MCP N8N Server listening on http://0.0.0.0:3302/mcp
   📊 Health check: http://0.0.0.0:3302/health
   🔑 API Key authentication enabled
   🎯 N8N URL: https://n8n.strangematic.com
   ```

### Issues Fixed During Deployment

1. **Shebang Issue** - Fixed tsup.config to not add shebang to cli-sdk.js
2. **SDK Version Mismatch** - Updated from 0.5.0 to 1.25.2 (match mcp-postgres)
3. **Docker Build** - Multi-stage build with mcp-core dependency working

### Configuration Files

1. **Environment** (`.env`):
   ```env
   MCP_API_KEY=mcp_a38e0558e20d832ad0c0c48eec5434f3
   N8N_URL=https://n8n.strangematic.com
   N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   N8N_TIMEOUT=30000
   ```

2. **Server Config** (`/home/strange/.mcp.json`):
   ```json
   {
     "strange-mcp-n8n": {
       "type": "http",
       "url": "http://localhost:3302/mcp",
       "headers": {
         "X-API-Key": "mcp_a38e0558e20d832ad0c0c48eec5434f3"
       }
     }
   }
   ```

3. **Client Config** (`figma-strange/.mcp.json`):
   ```json
   {
     "strange-mcp-n8n": {
       "type": "http",
       "url": "https://mcp-n8n.strangematic.com/mcp",
       "headers": {
         "CF-Access-Client-Id": "831e4b734836c75d63b05ae18fa5bd7f.access",
         "CF-Access-Client-Secret": "4980d5286ddaf65e1a0633df11f9132579fd980c74be7753b7253aabd5e037d2",
         "X-API-Key": "mcp_a38e0558e20d832ad0c0c48eec5434f3"
       },
       "description": "TODO: Setup CF tunnel"
     }
   }
   ```

## Next Steps

### 1. UAT Testing (Server-Side)

Test from server with Claude Code CLI:

```bash
cd /home/strange
claude code

# Test workflow_list tool
# Ask Claude: "List all N8N workflows"
```

### 2. Setup Cloudflare Tunnel

Create tunnel for external access:

1. Add tunnel in Cloudflare dashboard
   - Name: `mcp-n8n`
   - Public hostname: `mcp-n8n.strangematic.com`
   - Service: `http://localhost:3302`

2. Add CF Access policy
   - Reuse service token: `claude-code-external-2026-01-20`
   - Or create new policy

3. Test from client:
   ```bash
   cd /home/strange/projects/figma-strange
   claude code
   # Test workflow_list tool
   ```

### 3. Verify Tools

Test all 6 tools:

**Workflow Management**:
- ✅ `workflow_list` - List workflows with filtering
- ✅ `workflow_get` - Get workflow details by ID
- ✅ `workflow_create` - Create from simplified schema
- ✅ `workflow_update` - Update workflow (full definition)

**Execution Management**:
- ✅ `execution_list` - List executions with filtering
- ✅ `execution_debug` - Get node-level debug data

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Server (selfhost)                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  strange-mcp-n8n-server (Docker) ✅ HEALTHY            │ │
│  │  Port: 3302                                            │ │
│  │  Network: selfhost_internal                            │ │
│  │  ├─ MCP Server (Streamable HTTP v1.25.2)              │ │
│  │  ├─ N8N Client → https://n8n.strangematic.com          │ │
│  │  └─ 6 Tools (workflow + execution management)          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Technical Details

- **Package**: `strange-mcp-n8n@1.2.0`
- **SDK**: `@modelcontextprotocol/sdk@1.25.2`
- **Tests**: 45 passing (88.33% coverage)
- **Build Size**: 531.63 KB (cli-sdk.js)
- **Docker Image**: `strange-mcp-n8n:latest`
- **Container**: Non-root user (`mcp:mcp`, UID/GID 1001)
- **Health Check**: Node fetch to `/health` every 30s

## Files Created/Modified

**New Files**:
- `/home/strange/projects/strange-mcp-n8n/src/server-sdk.ts`
- `/home/strange/projects/strange-mcp-n8n/src/cli-sdk.ts`
- `/home/strange/projects/strange-mcp-n8n/Dockerfile`
- `/home/strange/projects/strange-mcp-n8n/docker-compose.yml`
- `/home/strange/projects/strange-mcp-n8n/.env`
- `/home/strange/projects/strange-mcp-n8n/.env.example`

**Modified Files**:
- `/home/strange/projects/strange-mcp-n8n/tsup.config.ts` (separate configs for index and cli-sdk)
- `/home/strange/projects/strange-mcp-n8n/package.json` (SDK version 1.25.2)
- `/home/strange/.mcp.json` (added mcp-n8n server)
- `/home/strange/projects/figma-strange/.mcp.json` (added mcp-n8n server)

## Quick Commands

```bash
# Check container status
docker ps | grep strange-mcp-n8n

# View logs
docker logs strange-mcp-n8n-server

# Restart container
cd /home/strange/projects/strange-mcp-n8n
docker compose restart

# Stop container
docker compose down

# Start container
docker compose up -d

# Test health
curl http://localhost:3302/health
```

---

🎉 **Deployment Complete!** Ready for UAT testing and Cloudflare Tunnel setup.
