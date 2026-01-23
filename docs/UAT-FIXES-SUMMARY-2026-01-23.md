# UAT Critical Fixes Summary

**Date:** 2026-01-23
**Status:** Code fixes identified but deployment blocked by build errors
**Recommendation:** Fix build errors first, then apply these changes

---

## UAT Findings Recap

1. **❌ BLOCKER:** Multi-output node connections broken (IF/Switch create linear chains)
2. **❌ BLOCKER:** Knowledge layer tools not registered in MCP server (0/5 tools)
3. **⚠️ Minor:** builder_commit trigger validation incorrect
4. **🔴 Build Issue:** Current master doesn't build (`applyNodeDefaults` export missing)

---

## Fix 1: Multi-Output Node Connection Logic ✅ CODE READY

**File:** `src/services/workflow-transformer.ts`

**Issue:** Lines 71-83 auto-connect all nodes linearly, even IF/Switch nodes

**Fix Applied:** See commit on branch (if created) or apply this logic:

```typescript
// REPLACE lines 37-84 with:

    // Track which steps have been used as connection targets
    const usedAsTarget = new Set<number>();

    // Generate connections
    simplified.steps.forEach((step, index) => {
      const mapping = getNodeMapping(step.type);
      const sourceNodeName = nodes[index].name;

      if (step.next) {
        // Explicit next connections
        const targets = Array.isArray(step.next) ? step.next : [step.next];

        // For IF/Switch nodes, each target goes to a separate output port
        if (mapping?.category === 'logic' && (step.type === 'if' || step.type === 'switch')) {
          connections[sourceNodeName] = {
            main: targets.map(targetName => {
              const targetNodeName = nameToId.get(targetName) || targetName;
              return [{
                node: targetNodeName,
                type: 'main' as const,
                index: 0,
              }];
            }),
          };
        } else {
          // Regular nodes: all targets on same output port
          connections[sourceNodeName] = {
            main: [
              targets.map(targetName => {
                const targetNodeName = nameToId.get(targetName) || targetName;
                return {
                  node: targetNodeName,
                  type: 'main' as const,
                  index: 0,
                };
              }),
            ],
          };
        }

        // Mark targets as used
        targets.forEach(targetName => {
          const targetIndex = simplified.steps.findIndex(s =>
            (s.name || `Step ${simplified.steps.indexOf(s) + 1}`) === targetName
          );
          if (targetIndex >= 0) {
            usedAsTarget.add(targetIndex);
          }
        });
      } else if (index < simplified.steps.length - 1) {
        // Auto-connect logic: Handle branching nodes specially
        if (mapping?.category === 'logic' && (step.type === 'if' || step.type === 'switch')) {
          // IF node: Auto-connect next 2 steps to output ports 0 and 1
          // Switch node: Auto-connect next N steps based on rules count
          const outputCount = step.type === 'if' ? 2 : (step.config?.rules?.length || 0) + 1;
          const outputs: Array<Array<{ node: string; type: 'main'; index: number }>> = [];

          for (let outputIndex = 0; outputIndex < outputCount; outputIndex++) {
            const targetIndex = index + 1 + outputIndex;
            if (targetIndex < simplified.steps.length && !usedAsTarget.has(targetIndex)) {
              outputs.push([{
                node: nodes[targetIndex].name,
                type: 'main' as const,
                index: 0,
              }]);
              usedAsTarget.add(targetIndex);
            } else {
              outputs.push([]); // Empty output if no target available
            }
          }

          connections[sourceNodeName] = { main: outputs };
        } else if (!usedAsTarget.has(index + 1)) {
          // Regular node: Auto-connect to next step if it hasn't been used
          const targetNodeName = nodes[index + 1].name;

          connections[sourceNodeName] = {
            main: [[{
              node: targetNodeName,
              type: 'main' as const,
              index: 0,
            }]],
          };

          usedAsTarget.add(index + 1);
        }
      }
    });
```

**Validation After Fix:**
```bash
# Create test workflow
workflow_create with IF node + 2 branches

# Check connections
Should see:
- IF node with main: [[...], [...]]  (2 arrays = 2 outputs)
- NOT: linear chain
```

---

## Fix 2: Register Knowledge Layer Tools ✅ CODE READY

**File:** `src/server-sdk.ts`

**Issue:** Knowledge layer tools exist but not registered with MCP server

**Fix Applied:**

1. Add import (after line 36):
```typescript
// Knowledge Layer (Phase 3A)
import {
  handleSchemaGet,
  handleSchemaList,
  handleQuirksCheck,
  handleQuirksSearch,
  handleSchemaValidate,
} from './knowledge/mcp-tool-handlers.js';
```

2. Register 5 tools (before `return server;` around line 626):
```typescript
  // ========================================================================
  // KNOWLEDGE LAYER TOOLS (Phase 3A)
  // ========================================================================

  // Tool: schema_get
  server.registerTool(
    'schema_get',
    {
      description:
        'Get validated schema information for a specific N8N node type. ' +
        'Returns all valid parameter formats, compatibility information, and examples. ' +
        'Use this before creating nodes to understand the correct structure.',
      inputSchema: {
        nodeType: z.string().describe('Simplified node type identifier (e.g., "if", "switch", "filter")'),
        typeVersion: z.number().optional().describe('Node type version number (optional, defaults to 1)'),
      },
    },
    async (args, _extra) => {
      const result = await handleSchemaGet(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: schema_list
  server.registerTool(
    'schema_list',
    {
      description:
        'List all available node schemas in the knowledge library. ' +
        'Useful for discovering what schemas are documented and available.',
      inputSchema: {
        status: z.enum(['recommended', 'deprecated', 'experimental']).optional().describe('Filter by format status (optional)'),
      },
    },
    async (args, _extra) => {
      const result = await handleSchemaList(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: quirks_check
  server.registerTool(
    'quirks_check',
    {
      description:
        'Check for known API/UI behavior mismatches (quirks) affecting a specific node type. ' +
        'Returns quirks with severity levels, symptoms, workarounds, and auto-fix availability. ' +
        'IMPORTANT: Always call this before creating nodes to avoid known issues.',
      inputSchema: {
        nodeType: z.string().describe('Simplified node type identifier (e.g., "if", "switch")'),
        typeVersion: z.number().optional().describe('Node type version number (optional)'),
      },
    },
    async (args, _extra) => {
      const result = await handleQuirksCheck(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: quirks_search
  server.registerTool(
    'quirks_search',
    {
      description:
        'Search for quirks by matching error symptoms or keywords. ' +
        'Useful when diagnosing unknown issues or debugging workflow problems. ' +
        'Example symptoms: "empty canvas", "could not find", "rendering error"',
      inputSchema: {
        symptoms: z.array(z.string()).describe('Array of symptom keywords to search for (e.g., ["empty", "canvas"])'),
      },
    },
    async (args, _extra) => {
      const result = await handleQuirksSearch(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: schema_validate
  server.registerTool(
    'schema_validate',
    {
      description:
        'Validate node parameters against known schema formats. ' +
        'Checks if parameters match any valid format and returns errors/warnings. ' +
        'Detects deprecated formats and UI-incompatible structures. ' +
        'Use before committing workflows to prevent rendering issues.',
      inputSchema: {
        nodeType: z.string().describe('Simplified node type identifier'),
        parameters: z.record(z.any()).describe('Node parameters to validate (JSON object)'),
        typeVersion: z.number().optional().describe('Node type version number (optional)'),
      },
    },
    async (args, _extra) => {
      const result = await handleSchemaValidate(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
```

**Validation After Fix:**
```bash
# Test via MCP
schema_list → Should return 3+ schemas
quirks_search symptoms=["format"] → Should return If-node quirk
schema_get nodeType="if" → Should return If-node schema
```

---

## Fix 3: builder_commit Trigger Validation (Optional)

**File:** `src/tools/builder-commit.ts`

**Issue:** Trigger detection logic differs from builder_preview

**Investigation Needed:**
1. Compare trigger detection in `builder-commit.ts` vs `builder-preview.ts`
2. Ensure both use same validation logic
3. Test with manual trigger workflow

**Workaround:** Use `workflow_create` instead of builder pattern

---

## Deployment Checklist

### Pre-Deployment

- [ ] Fix build error: `applyNodeDefaults` export missing in `src/schema/index.ts`
- [ ] Apply Fix 1: Multi-output node connections
- [ ] Apply Fix 2: Knowledge layer tool registration
- [ ] Run build: `npm run build` → Should succeed
- [ ] Run tests: `npm test` → Check if E2E still pass
- [ ] Bump version: Update to 1.3.0 in package.json

### Build \u0026 Deploy

```bash
# Build Docker image
docker build -t strange-mcp-n8n:1.3.0 .
docker tag strange-mcp-n8n:1.3.0 strange-mcp-n8n:latest

# Stop current container
docker stop strange-mcp-n8n-server

# Start new container
docker run -d \\
  --name strange-mcp-n8n-server \\
  --network selfhost_default \\
  -p 3302:3302 \\
  -e N8N_URL=http://n8n-server:5678 \\
  -e N8N_API_KEY=$N8N_API_KEY \\
  -e MCP_API_KEY=$MCP_API_KEY \\
  -e REDIS_URL=redis://redis:6379 \\
  strange-mcp-n8n:latest

# Check health
curl http://localhost:3302/health
```

### Post-Deployment Validation

```bash
# Re-run UAT scenarios
# UAT-001: Health Check
workflow_list → OK
schema_list → Should work now (3+ schemas)
quirks_search symptoms=["format"] → Should work now

# UAT-002: If-Node
workflow_create with IF node
workflow_get → Check connections structure
# Expected: IF.main = [[trueBranch], [falseBranch]]

# UAT-007: Complex Pipeline
workflow_create with complex IF workflow
workflow_get → Verify branching connections
# Expected: Proper branches, not linear chain
```

### Success Criteria

✅ Build completes without errors
✅ 5 knowledge tools available via MCP
✅ IF/Switch nodes create branched connections
✅ UAT-002 and UAT-007 pass
✅ No regression in other workflows

---

## Known Issues

1. **Build Error:** Current master has import issue with `applyNodeDefaults`
   - **Impact:** Cannot build/deploy until fixed
   - **Resolution:** Add export or fix import

2. **HTML Entity Encoding:** Write tool introduced `\u003c` / `\u003e` entities
   - **Impact:** Breaks TypeScript compilation
   - **Resolution:** Use Edit tool or apply changes via git patch

3. **builder_commit Bug:** Minor, has workaround (use workflow_create)

---

## Files Modified

1. `src/services/workflow-transformer.ts` - Multi-output connection logic
2. `src/server-sdk.ts` - Knowledge layer tool registration

## Files Created

1. `docs/UAT-EXECUTION-REPORT-2026-01-23.md` - Comprehensive UAT findings
2. `docs/UAT-FIXES-SUMMARY-2026-01-23.md` - This file

---

## Time Estimate

- Fix build error: 30 min
- Apply Fix 1 \u0026 2: 15 min (code ready, just apply)
- Build \u0026 deploy: 10 min
- Run UAT validation: 15 min
- **Total: ~70 minutes**

---

## Next Session Actions

1. Start with: `git status` to see current state
2. Fix build error first (priority)
3. Apply the 2 fixes from this document
4. Build, deploy, rerun UAT
5. Update session context with results
