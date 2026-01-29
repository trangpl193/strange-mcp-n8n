# Phase 1.5 Integration Guide

## Status: Tools Created ✅, Server Integration Pending

### Files Created (Phase 1.5)

1. ✅ `/src/tools/note-create.ts` - Create documentation notes
2. ✅ `/src/tools/note-update.ts` - Update existing notes
3. ✅ `/src/tools/note-delete.ts` - Delete notes
4. ✅ `/src/tools/index.ts` - Exports updated
5. ✅ `/src/server.ts` - Imports updated

### Remaining Integration Steps

#### Step 1: Add Tool Definitions to server.ts

Add these tool definitions to the `tools` array in `server.ts` (around line 285, before `...knowledgeLayerTools`):

```typescript
        {
          name: 'note_create',
          description: 'Create a documentation note (sticky note) in a workflow. Use templates (changelog, usage, architecture) or provide custom content.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'Workflow ID',
              },
              name: {
                type: 'string',
                description: 'Note name (default: "Note")',
              },
              template: {
                type: 'string',
                enum: ['changelog', 'usage', 'architecture'],
                description: 'Template to use (optional)',
              },
              template_variables: {
                type: 'object',
                description: 'Variables for template substitution (required if template specified)',
              },
              content: {
                type: 'string',
                description: 'Direct content (use if not using template)',
              },
              position: {
                type: 'array',
                description: 'Note position [x, y] (optional, auto-calculated)',
                items: {
                  type: 'number',
                },
                minItems: 2,
                maxItems: 2,
              },
              height: {
                type: 'number',
                description: 'Note height in pixels (default: 300)',
                default: 300,
              },
              width: {
                type: 'number',
                description: 'Note width in pixels (default: 400)',
                default: 400,
              },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'note_update',
          description: 'Update an existing documentation note (sticky note). Only specified fields will be updated.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'Workflow ID',
              },
              note_name: {
                type: 'string',
                description: 'Name of the note to update',
              },
              content: {
                type: 'string',
                description: 'New content (merged with existing)',
              },
              height: {
                type: 'number',
                description: 'New height in pixels',
              },
              width: {
                type: 'number',
                description: 'New width in pixels',
              },
            },
            required: ['workflow_id', 'note_name'],
          },
        },
        {
          name: 'note_delete',
          description: 'Delete a documentation note (sticky note) from a workflow. Cannot be undone.',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: {
                type: 'string',
                description: 'Workflow ID',
              },
              note_name: {
                type: 'string',
                description: 'Name of the note to delete',
              },
            },
            required: ['workflow_id', 'note_name'],
          },
        },
```

#### Step 2: Add Tool Handlers to server.ts

Add these case handlers to the `switch (name)` statement in `setRequestHandler` (around line 443, after `execution_debug`):

```typescript
          case 'note_create': {
            const input = args as NoteCreateInput;
            const result = await noteCreate(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'note_update': {
            const input = args as NoteUpdateInput;
            const result = await noteUpdate(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'note_delete': {
            const input = args as NoteDeleteInput;
            const result = await noteDelete(this.client, input);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }
```

### Alternative: Quick Test Without Full Integration

If you want to test helpers without full MCP integration:

```bash
# Use test script directly
cd /home/strange/projects/strange-mcp-n8n
npx ts-node scripts/test-note-crud.ts
```

### Next Steps After Integration

1. Rebuild MCP server: `npm run build`
2. Restart MCP server: `docker compose restart mcp-n8n`
3. Test via MCP client
4. Update context in database

### Decision Point

**Option A**: Complete server integration now (+30min effort)
**Option B**: Defer to when Phase 2 requires rebuild anyway (recommended)
**Option C**: Use helpers directly in future workflow operations (no server changes)

**Recommendation**: Option C - Helpers are ready to use, server exposure can wait for Phase 2 rebuild.
