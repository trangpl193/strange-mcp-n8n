# Autonomous Validation Agent Design

**Created**: 2026-01-25
**Purpose**: Prevent UI-incompatible workflows from being created
**Trigger**: Switch node format incompatibility incident

## Problem Statement

Current builder system can create workflows that:
- ✅ Pass N8N API validation (HTTP 200)
- ✅ Appear in workflow list
- ❌ **FAIL to render in N8N UI** (blank canvas, console errors)

**Root Cause**: Knowledge-Practice Gap
```
Schema Knowledge → Builder → N8N API → ✅ Accepts
                                    ↓
                              N8N UI → ❌ Rejects
```

## Solution: Multi-Layer Validation System

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: Pre-Commit Validation (Builder Side)                     │
├─────────────────────────────────────────────────────────────────────┤
│  • Schema validation (existing)                                     │
│  • Quirks check (existing)                                          │
│  • NEW: Format transformation (auto-fix)                            │
│  • NEW: UI compatibility check (pre-flight)                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: Post-Commit Validation (After N8N API)                   │
├─────────────────────────────────────────────────────────────────────┤
│  • Fetch created workflow from N8N                                  │
│  • Validate actual structure matches expected                       │
│  • Check for known quirk symptoms in response                       │
│  • NEW: Render compatibility test                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: Autonomous Repair Agent                                  │
├─────────────────────────────────────────────────────────────────────┤
│  • Detect incompatible format in created workflow                   │
│  • Auto-fix using node_update tool                                  │
│  • Verify fix worked                                                │
│  • Update knowledge base with new patterns                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Agent Behaviors

### 1. Pre-Commit Validation (Proactive)

**When**: Before `builder_commit`
**Action**: Transform parameters to UI-compatible format

```typescript
async function validateBeforeCommit(draft: WorkflowDraft): Promise<ValidationResult> {
  const issues: Issue[] = [];

  for (const node of draft.nodes) {
    // Check quirks database
    const quirks = await quirks_check(node.type);

    for (const quirk of quirks) {
      if (quirk.severity === 'critical' && quirk.autoFixAvailable) {
        // Auto-fix critical issues
        node.parameters = await applyQuirkFix(quirk, node.parameters);
        issues.push({
          severity: 'fixed',
          message: `Auto-fixed: ${quirk.title}`,
          nodeId: node.id
        });
      } else {
        issues.push({
          severity: quirk.severity,
          message: quirk.workaround,
          nodeId: node.id
        });
      }
    }

    // Validate against schema
    const schemaResult = await schema_validate(node.type, node.parameters);
    if (!schemaResult.isValid) {
      issues.push(...schemaResult.errors);
    }
  }

  return { issues, autoFixed: issues.filter(i => i.severity === 'fixed') };
}
```

### 2. Post-Commit Validation (Reactive)

**When**: Immediately after workflow created
**Action**: Verify workflow is UI-compatible

```typescript
async function validateAfterCommit(workflowId: string): Promise<ValidationResult> {
  // Fetch created workflow
  const workflow = await workflow_get(workflowId);

  const issues: Issue[] = [];

  for (const node of workflow.nodes) {
    // Check for known quirk symptoms
    const quirks = await quirks_check(node.type);

    for (const quirk of quirks) {
      const hasSymptom = checkQuirkSymptom(quirk, node.parameters);

      if (hasSymptom) {
        if (quirk.autoFixAvailable) {
          // Auto-repair
          await node_update({
            workflowId,
            nodeIdentifier: node.name,
            parameters_json: await applyQuirkFix(quirk, node.parameters)
          });

          issues.push({
            severity: 'repaired',
            message: `Auto-repaired: ${quirk.title}`,
            nodeId: node.id
          });
        } else {
          issues.push({
            severity: quirk.severity,
            message: `DETECTED: ${quirk.title} - ${quirk.workaround}`,
            nodeId: node.id
          });
        }
      }
    }
  }

  return { issues };
}
```

### 3. Autonomous Repair Agent (Self-Healing)

**When**: User reports UI rendering issue OR scheduled health check
**Action**: Scan and fix existing workflows

```typescript
async function autonomousRepairAgent(): Promise<RepairReport> {
  // Discover all workflows
  const workflows = await workflow_discover();

  const repairLog: RepairEntry[] = [];

  for (const wf of workflows) {
    try {
      const fullWorkflow = await workflow_get(wf.id);

      for (const node of fullWorkflow.nodes) {
        const quirks = await quirks_check(node.type);

        for (const quirk of quirks) {
          if (quirk.autoFixAvailable && checkQuirkSymptom(quirk, node.parameters)) {
            // Found incompatible format
            const fixedParams = await applyQuirkFix(quirk, node.parameters);

            // Apply fix
            await node_update({
              workflowId: wf.id,
              nodeIdentifier: node.name,
              parameters_json: fixedParams
            });

            repairLog.push({
              workflowId: wf.id,
              workflowName: wf.name,
              nodeId: node.id,
              nodeName: node.name,
              quirkId: quirk.id,
              quirkTitle: quirk.title,
              action: 'repaired',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      repairLog.push({
        workflowId: wf.id,
        workflowName: wf.name,
        action: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return { repairLog, totalRepaired: repairLog.filter(r => r.action === 'repaired').length };
}
```

## Integration Points

### Builder Integration

```typescript
// In builder_commit tool
export async function builderCommit(input: BuilderCommitInput): Promise<BuilderCommitOutput> {
  // LAYER 1: Pre-commit validation
  const preValidation = await validateBeforeCommit(session.workflow_draft);

  if (preValidation.issues.some(i => i.severity === 'error')) {
    throw new McpError(McpErrorCode.INVALID_PARAMS, 'Validation failed', {
      details: preValidation.issues
    });
  }

  // Create workflow
  const created = await workflow_create({
    name: session.workflow_draft.name,
    nodes_json: JSON.stringify(nodes),
    connections_json: JSON.stringify(connections)
  });

  // LAYER 2: Post-commit validation
  const postValidation = await validateAfterCommit(created.id);

  return {
    success: true,
    workflow_id: created.id,
    workflow_url: created.url,
    validation: {
      preCommit: preValidation,
      postCommit: postValidation
    }
  };
}
```

### Scheduled Health Check (N8N Workflow)

```yaml
# N8N Workflow: Autonomous Validation Agent (Scheduled)

name: "Autonomous Validation Agent - Health Check"
schedule: "0 2 * * *"  # Daily at 2 AM

steps:
  - name: Discover Workflows
    type: http
    config:
      method: GET
      url: "{{$env.MCP_URL}}/mcp"
      body:
        jsonrpc: "2.0"
        method: "workflow_discover"

  - name: Check Each Workflow
    type: code
    config:
      code: |
        const workflows = $input.first().json.result.workflows;
        const issues = [];

        for (const wf of workflows) {
          // Call MCP to check for quirks
          const checkResult = await fetch('{{$env.MCP_URL}}/mcp', {
            method: 'POST',
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'quirks_check_workflow',
              params: { workflowId: wf.id }
            })
          }).then(r => r.json());

          if (checkResult.result.hasIssues) {
            issues.push({
              workflowId: wf.id,
              workflowName: wf.name,
              issues: checkResult.result.issues
            });
          }
        }

        return [{ json: { issues, totalFound: issues.length } }];

  - name: Auto-Repair If Needed
    type: switch
    config:
      mode: expression
      output: multipleOutputs
      rules:
        rules:
          - outputKey: has_issues
            conditions:
              combinator: and
              conditions:
                - leftValue: "={{ $json.totalFound }}"
                  rightValue: "0"
                  operator:
                    type: number
                    operation: gt

  - name: Repair Workflows
    type: http
    config:
      method: POST
      url: "{{$env.MCP_URL}}/mcp"
      body:
        jsonrpc: "2.0"
        method: "autonomous_repair_agent"

  - name: Send Report
    type: discord
    config:
      channelId: "{{$env.DISCORD_CHANNEL_ID}}"
      content: |
        🔧 **Autonomous Validation Agent Report**

        Date: {{$now}}
        Workflows Checked: {{$('Discover Workflows').first().json.result.workflows.length}}
        Issues Found: {{$('Check Each Workflow').first().json.totalFound}}
        Repairs Made: {{$json.repairLog.length}}

        Details: See repair log
```

## Knowledge Base Update Loop

```typescript
// Detect new patterns and update knowledge base
async function updateKnowledgeBase(repairLog: RepairEntry[]) {
  // Analyze repair patterns
  const patterns = analyzePatterns(repairLog);

  for (const pattern of patterns) {
    if (pattern.frequency > 5) {
      // Frequent issue - should be in quirks database
      const existingQuirk = await findQuirk(pattern.nodeType, pattern.symptom);

      if (!existingQuirk) {
        // New quirk discovered
        await createQuirkEntry({
          nodeType: pattern.nodeType,
          title: pattern.title,
          symptoms: pattern.symptoms,
          rootCause: pattern.rootCause,
          workaround: pattern.workaround,
          autoFixAvailable: true,
          discoveredDate: new Date().toISOString()
        });
      }
    }
  }
}
```

## Benefits

1. **Proactive Prevention**: Fixes issues before they reach N8N
2. **Reactive Repair**: Detects and fixes issues in created workflows
3. **Self-Healing**: Automatically scans and repairs existing workflows
4. **Knowledge Growth**: Learns from repairs and updates quirks database
5. **Zero User Impact**: All fixes happen transparently

## Implementation Checklist

- [x] Schema knowledge updated with correct format
- [x] Quirks entry created for Switch node
- [x] Builder transform function added (applySwitchNodeMultipleOutputsFormat)
- [x] Workflow transformer updated (rules.rules support)
- [ ] Pre-commit validation function
- [ ] Post-commit validation function
- [ ] Autonomous repair agent function
- [ ] N8N scheduled workflow for health checks
- [ ] Knowledge base update loop
- [ ] MCP tool: quirks_check_workflow
- [ ] MCP tool: autonomous_repair_agent
- [ ] Integration tests for validation pipeline

## Next Steps

1. Implement pre-commit validation in builder_commit
2. Implement post-commit validation hook
3. Create autonomous repair agent function
4. Create N8N workflow for scheduled health checks
5. Test with Context Manager Bot workflow
6. Deploy to production

## Related Documents

- `/home/strange/projects/strange-mcp-n8n/src/knowledge/schemas/switch-node.ts` - Schema definition
- `/home/strange/projects/strange-mcp-n8n/src/knowledge/quirks/switch-node.ts` - Quirk database
- `/home/strange/projects/strange-mcp-n8n/src/tools/builder-add-node.ts` - Builder transform logic
- `/home/strange/.user/conversation/25-1-2026.md` - Incident report

