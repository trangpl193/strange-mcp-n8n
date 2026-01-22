# Knowledge Layer Usage Guide

**Phase 3A: AI Agent Self-Diagnosis System**
**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2026-01-22

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [MCP Tools Reference](#mcp-tools-reference)
5. [Schema Format Guide](#schema-format-guide)
6. [Quirks Database](#quirks-database)
7. [Builder Integration](#builder-integration)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Knowledge Layer is an AI agent self-diagnosis system that provides:

- **Schema Validation**: Validates N8N node parameters against known correct formats
- **Quirks Detection**: Identifies known API/UI behavior mismatches
- **Auto-Fix Guidance**: Suggests corrections for deprecated or broken formats
- **Builder Integration**: Real-time validation during workflow construction

### Why Knowledge Layer?

**Problem**: AI agents creating N8N workflows encountered mysterious errors where workflows worked via API but broke in the UI due to format mismatches.

**Solution**: A knowledge base of validated schemas and known quirks that AI agents can query before committing workflows.

**Impact**:
- ✅ Prevents UI rendering errors
- ✅ Detects deprecated formats
- ✅ Provides workarounds for known quirks
- ✅ Enables self-diagnosis without human intervention

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Schemas    │  │    Quirks    │  │  Validation  │      │
│  │   Registry   │  │   Database   │  │    Engine    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │   MCP Tools     │                        │
│                  │  (5 functions)  │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Builder Tools  │
                   │  (Integration)  │
                   └─────────────────┘
```

### Components

1. **Schema Registry** (`src/knowledge/core/registry.ts`)
   - Stores validated node schemas
   - Manages schema lifecycle
   - Provides query interface

2. **Node Schemas** (`src/knowledge/schemas/`)
   - If-node schema (2 formats: combinator, legacy_options)
   - Switch-node schema (2 formats: rules, expression)
   - Filter-node schema (1 format: conditions)

3. **Quirks Database** (`src/knowledge/quirks/`)
   - Documents known issues
   - Severity levels: critical, warning, info
   - Auto-fix availability flags

4. **MCP Tools** (`src/knowledge/tools.ts`)
   - 5 functions for AI agent access
   - Schema retrieval, validation, quirks checking

5. **Builder Integration** (`src/tools/builder-*.ts`)
   - Real-time validation during node creation
   - Preview validation before commit

---

## Quick Start

### 1. Initialize Knowledge Layer

```typescript
import { initializeCoreSchemas } from './knowledge/index.js';

// Initialize at server startup
await initializeCoreSchemas();
// Output: ✅ Knowledge Layer initialized: 3 schemas, 1 quirk registered
```

### 2. Get Schema Information

```typescript
import { schema_get } from './knowledge/index.js';

// Get If-node schema
const schema = await schema_get('if', 1);

console.log(schema.nodeType); // 'if'
console.log(schema.formats.length); // 2 (combinator, legacy_options)

// Find recommended format
const recommended = schema.formats.find(f => f.status === 'recommended');
console.log(recommended.name); // 'combinator'
```

### 3. Validate Node Parameters

```typescript
import { schema_validate } from './knowledge/index.js';

// Validate If-node parameters
const result = await schema_validate('if', {
  conditions: {
    combinator: 'and',
    conditions: [
      {
        leftValue: '={{ $json.status }}',
        rightValue: 'active',
        operator: { type: 'string', operation: 'equals' }
      }
    ]
  }
});

console.log(result.valid); // true
console.log(result.matchedFormat); // 'combinator'
console.log(result.warnings); // []
```

### 4. Check for Known Quirks

```typescript
import { quirks_check } from './knowledge/index.js';

// Check If-node quirks
const quirks = await quirks_check('if');

quirks.forEach(quirk => {
  console.log(`[${quirk.severity}] ${quirk.title}`);
  console.log(`Workaround: ${quirk.workaround}`);
  console.log(`Auto-fix: ${quirk.autoFixAvailable ? 'YES' : 'NO'}`);
});

// Output:
// [critical] If-node has two incompatible schema formats
// Workaround: Always use "combinator" format for If-node...
// Auto-fix: YES
```

---

## MCP Tools Reference

### 1. schema_get()

Retrieve schema information for a specific node type.

**Signature**:
```typescript
async function schema_get(
  nodeType: string,
  typeVersion?: number
): Promise<NodeSchema>
```

**Parameters**:
- `nodeType`: Simplified node type (e.g., "if", "switch", "filter")
- `typeVersion`: Optional version number (defaults to 1)

**Returns**: `NodeSchema` with all valid formats

**Throws**: Error if node type not found

**Example**:
```typescript
const schema = await schema_get('switch');

// Access formats
schema.formats.forEach(format => {
  console.log(`Format: ${format.name}`);
  console.log(`Status: ${format.status}`);
  console.log(`UI Compatible: ${format.uiCompatible}`);
  console.log(`API Compatible: ${format.apiCompatible}`);
});
```

**Use Cases**:
- Before creating a node, understand correct parameter structure
- Choose between multiple valid formats
- Check UI/API compatibility

---

### 2. schema_list()

List all available node schemas.

**Signature**:
```typescript
async function schema_list(filter?: {
  status?: 'recommended' | 'deprecated' | 'experimental';
}): Promise<NodeSchema[]>
```

**Parameters**:
- `filter.status`: Optional filter by format status

**Returns**: Array of `NodeSchema` objects

**Example**:
```typescript
// Get all schemas
const allSchemas = await schema_list();
console.log(`Available schemas: ${allSchemas.length}`);

// Get only recommended formats
const recommended = await schema_list({ status: 'recommended' });
```

**Use Cases**:
- Discover available schemas
- Find nodes with recommended formats
- Audit deprecated formats

---

### 3. quirks_check()

Check for known quirks affecting a specific node type.

**Signature**:
```typescript
async function quirks_check(
  nodeType: string,
  typeVersion?: number
): Promise<Quirk[]>
```

**Parameters**:
- `nodeType`: Simplified node type
- `typeVersion`: Optional version filter

**Returns**: Array of `Quirk` objects

**Example**:
```typescript
const quirks = await quirks_check('if');

// Filter by severity
const critical = quirks.filter(q => q.severity === 'critical');

// Check auto-fix availability
const fixable = quirks.filter(q => q.autoFixAvailable);
```

**Use Cases**:
- Before committing workflow, check for known issues
- Provide warnings to users
- Guide auto-fix logic

---

### 4. quirks_search()

Search quirks by symptom keywords.

**Signature**:
```typescript
async function quirks_search(
  symptoms: string[]
): Promise<Quirk[]>
```

**Parameters**:
- `symptoms`: Array of symptom keywords

**Returns**: Array of matching `Quirk` objects

**Example**:
```typescript
// Search by error symptoms
const quirks = await quirks_search(['empty canvas', 'could not find']);

quirks.forEach(quirk => {
  console.log(`Found: ${quirk.id}`);
  console.log(`Affects: ${quirk.affectedNodes.join(', ')}`);
});
```

**Use Cases**:
- Diagnose unknown errors
- Match error messages to known quirks
- Troubleshooting workflows

---

### 5. schema_validate()

Validate node parameters against known schemas.

**Signature**:
```typescript
async function schema_validate(
  nodeType: string,
  parameters: Record<string, unknown>,
  typeVersion?: number
): Promise<SchemaValidationResult>
```

**Parameters**:
- `nodeType`: Node type to validate
- `parameters`: Node parameters object
- `typeVersion`: Optional version

**Returns**: `SchemaValidationResult` with errors, warnings, suggestions

**Example**:
```typescript
const result = await schema_validate('if', {
  conditions: {
    string: [/* legacy format */]
  }
});

if (!result.valid) {
  console.error('Validation failed:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
  // Warning: Format 'legacy_options' is deprecated
}

console.log(`Matched format: ${result.matchedFormat}`);
```

**Use Cases**:
- Validate parameters before creating node
- Detect deprecated formats
- Get suggestions for fixes

---

## Schema Format Guide

### If-Node Formats

#### ✅ Combinator Format (Recommended)

**Status**: Recommended, UI-compatible, API-compatible

```typescript
{
  conditions: {
    combinator: 'and' | 'or',  // Logical operator
    conditions: [
      {
        leftValue: string,        // E.g., '={{ $json.field }}'
        rightValue: any,          // Value to compare
        operator: {
          type: 'string' | 'number' | 'boolean' | 'date',
          operation: string       // E.g., 'equals', 'contains'
        }
      }
    ]
  }
}
```

**Example**:
```typescript
{
  conditions: {
    combinator: 'and',
    conditions: [
      {
        leftValue: '={{ $json.status }}',
        rightValue: 'active',
        operator: { type: 'string', operation: 'equals' }
      },
      {
        leftValue: '={{ $json.count }}',
        rightValue: 10,
        operator: { type: 'number', operation: 'gt' }
      }
    ]
  }
}
```

#### ⚠️ Legacy Options Format (Deprecated)

**Status**: Deprecated, NOT UI-compatible, API-compatible

```typescript
{
  conditions: {
    options: {},  // Empty object
    string?: Array<{ value1, value2, operation }>,
    number?: Array<{ value1, value2, operation }>,
    boolean?: Array<{ value1, value2, operation }>
  }
}
```

**⚠️ WARNING**: This format works via API but breaks in N8N UI with error:
```
Console error: Could not find property option
Empty workflow canvas
```

**Migration**: Use combinator format instead.

---

### Switch-Node Formats

#### ✅ Rules Format (Recommended)

**Status**: Recommended, UI-compatible

```typescript
{
  mode: 'rules',
  rules: {
    values: [
      {
        conditions: {
          combinator: 'and' | 'or',
          conditions: [/* same as If-node */]
        },
        renameOutput?: boolean,
        outputKey?: string
      }
    ]
  }
}
```

#### ✅ Expression Format (Recommended)

**Status**: Recommended, UI-compatible

```typescript
{
  mode: 'expression',
  output: string  // JavaScript expression
}
```

---

### Filter-Node Formats

#### ✅ Conditions Format (Recommended)

**Status**: Recommended, UI-compatible

```typescript
{
  conditions: {
    combinator: 'and' | 'or',
    conditions: [/* same as If-node */]
  }
}
```

---

## Quirks Database

### If-Node Dual Format Quirk

**ID**: `if-node-dual-format`
**Severity**: Critical
**Affects**: If-node (typeVersion 1)
**Auto-fix**: Available

**Symptoms**:
- Empty workflow canvas after creation
- Console error: "Could not find property option"
- Workflow works via API but not in UI

**Root Cause**:
If-node accepts two incompatible parameter formats:
1. **Combinator format** (UI + API compatible)
2. **Legacy options format** (API only, breaks UI)

**Workaround**:
Always use combinator format. Before committing workflow, ensure parameters match:

```typescript
{
  conditions: {
    combinator: 'and',  // NOT 'options: {}'
    conditions: [...]
  }
}
```

**Auto-Fix**:
The builder automatically transforms legacy format to combinator via `applyNodeDefaults()` in `src/schema/node-defaults/if-node.ts`.

**Reference**: See UAT Report: `UAT-REPORT-IF-NODE-DEFAULTS.md`

---

## Builder Integration

### Add Node Validation

When adding a node via `builder_add_node`, the knowledge layer automatically validates parameters:

```typescript
const result = await builderAddNode({
  session_id: 'session-123',
  node: {
    type: 'if',
    config: {
      conditions: {
        combinator: 'and',
        conditions: []
      }
    }
  }
});

// Check validation info
if (result.validation) {
  console.log('Has warnings:', result.validation.has_warnings);

  // Schema format warnings
  result.validation.warnings.forEach(w => {
    console.warn(w); // E.g., "Format 'legacy_options' is deprecated"
  });

  // Known quirks
  result.validation.quirks.forEach(q => {
    console.warn(q); // E.g., "[CRITICAL] If-node has two incompatible formats..."
  });
}
```

### Preview Validation

Before committing, use `builder_preview` to validate entire workflow:

```typescript
const preview = await builderPreview(client, { session_id: 'session-123' });

if (!preview.valid) {
  console.error('Workflow has errors:', preview.errors);

  // Schema validation errors (blocking)
  const schemaErrors = preview.errors.filter(e => e.code === 'SCHEMA_VALIDATION_FAILED');

  schemaErrors.forEach(err => {
    console.error(`Node '${err.context.node_name}': ${err.message}`);
    console.error(`Expected formats: ${err.context.expected_formats}`);
    console.error(`Suggestion: ${err.context.suggestion}`);
  });
}

// Check warnings (non-blocking)
const quirkWarnings = preview.warnings.filter(w => w.code === 'CRITICAL_QUIRK');

quirkWarnings.forEach(warn => {
  console.warn(`Node '${warn.context.node_name}': ${warn.message}`);
  console.warn(`Workaround: ${warn.context.workaround}`);
  console.warn(`Auto-fix available: ${warn.context.auto_fix_available}`);
});
```

---

## Testing Guide

### Unit Tests

**Location**: `__tests__/unit/knowledge/`

**Run tests**:
```bash
npm test -- knowledge
```

**Coverage**:
```bash
npm run test:coverage -- --testPathPattern=knowledge
```

**Test suites**:
1. `registry.test.ts` - Schema registry (16 tests)
2. `tools.test.ts` - MCP tools (26 tests)
3. `mcp-tool-handlers.test.ts` - MCP handlers (22 tests)

**Total**: 64 unit tests, 100% coverage

### Integration Tests

**Location**: `__tests__/integration/builder-knowledge-layer.test.ts`

**Run tests**:
```bash
npm test -- builder-knowledge-layer
```

**Test scenarios**:
- Builder add node with validation
- Builder preview with schema checking
- End-to-end workflow validation
- Error detection and reporting

**Total**: 11 integration tests

### Writing Tests

**Example - Schema Validation Test**:
```typescript
import { schema_validate } from '../../src/knowledge/index.js';

test('should validate correct combinator format', async () => {
  const result = await schema_validate('if', {
    conditions: {
      combinator: 'and',
      conditions: []
    }
  });

  expect(result.valid).toBe(true);
  expect(result.matchedFormat).toBe('combinator');
  expect(result.errors).toHaveLength(0);
});
```

---

## Troubleshooting

### Schema Not Found Error

**Error**: `Schema not found for node type: xyz`

**Cause**: Requested node type not in knowledge layer

**Solution**:
```typescript
// Check available schemas first
const schemas = await schema_list();
console.log('Available types:', schemas.map(s => s.nodeType));

// Only validate types that exist
const knownTypes = ['if', 'switch', 'filter'];
if (knownTypes.includes(nodeType)) {
  await schema_validate(nodeType, parameters);
}
```

### Validation Failures

**Scenario**: Parameters don't match any known format

**Debug**:
```typescript
const result = await schema_validate('if', parameters);

if (!result.valid) {
  console.error('Validation failed!');
  console.error('Expected formats:', result.errors[0].expected);
  console.error('Your parameters:', result.errors[0].actual);
  console.error('Suggestion:', result.suggestion);
}
```

**Common fixes**:
1. Check parameter structure matches schema examples
2. Ensure using recommended format
3. Verify typeVersion matches schema

### UI Rendering Errors

**Symptom**: Workflow created but UI shows empty canvas

**Diagnosis**:
```typescript
// Check for critical quirks
const quirks = await quirks_check(nodeType);
const critical = quirks.filter(q => q.severity === 'critical');

if (critical.length > 0) {
  console.error('CRITICAL QUIRKS FOUND:');
  critical.forEach(q => {
    console.error(`- ${q.title}`);
    console.error(`  Workaround: ${q.workaround}`);
  });
}
```

**Fix**: Follow quirk workarounds or use auto-fix if available

---

## Best Practices

### 1. Always Validate Before Commit

```typescript
// BAD: Create without validation
await builderCommit(client, { session_id });

// GOOD: Validate first
const preview = await builderPreview(client, { session_id });
if (preview.valid) {
  await builderCommit(client, { session_id });
} else {
  console.error('Fix errors before committing:', preview.errors);
}
```

### 2. Use Recommended Formats

```typescript
// Get schema
const schema = await schema_get(nodeType);

// Find recommended format
const recommended = schema.formats.find(f => f.status === 'recommended');

// Use this format for parameters
const parameters = buildParametersForFormat(recommended);
```

### 3. Check Quirks Proactively

```typescript
// Before creating critical nodes
const quirks = await quirks_check('if');
if (quirks.some(q => q.severity === 'critical')) {
  // Show warning or use auto-fix
}
```

### 4. Handle Missing Schemas Gracefully

```typescript
try {
  await schema_validate(nodeType, parameters);
} catch (error) {
  if (error.message.includes('Schema not found')) {
    // Node type not in knowledge layer - skip validation
    console.log(`No schema for ${nodeType}, skipping validation`);
  } else {
    throw error;
  }
}
```

---

## API Reference

### Types

```typescript
interface NodeSchema {
  nodeType: string;           // 'if', 'switch', 'filter'
  n8nType: string;            // 'n8n-nodes-base.if'
  typeVersion: number;        // 1, 2, etc.
  formats: SchemaFormat[];    // Valid parameter formats
  metadata: SchemaMetadata;   // Validation info
}

interface SchemaFormat {
  name: string;               // 'combinator', 'legacy_options'
  status: 'recommended' | 'deprecated' | 'experimental';
  uiCompatible: boolean;      // Works in N8N UI?
  apiCompatible: boolean;     // Works via N8N API?
  structure: object;          // Parameter structure
  examples: NodeExample[];    // Example parameters
}

interface Quirk {
  id: string;                 // 'if-node-dual-format'
  title: string;              // Human-readable title
  affectedNodes: string[];    // ['if']
  severity: 'critical' | 'warning' | 'info';
  symptoms: string[];         // Error messages, behaviors
  workaround: string;         // How to avoid
  autoFixAvailable: boolean;  // Can be auto-fixed?
  affectedVersions: {
    nodeTypeVersion: number[];
    n8nVersion?: string;
  };
}

interface SchemaValidationResult {
  valid: boolean;
  matchedFormat?: string;     // Which format matched
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestion?: string;        // How to fix
}
```

---

## Contributing

### Adding New Schemas

1. Create schema file in `src/knowledge/schemas/`:
```typescript
// src/knowledge/schemas/new-node.ts
export const newNodeSchema: NodeSchema = {
  nodeType: 'new',
  n8nType: 'n8n-nodes-base.new',
  typeVersion: 1,
  formats: [/* ... */],
  metadata: {
    source: 'ui_created',
    validatedBy: 'uat_testing',
    validatedDate: '2026-01-22',
    n8nVersion: '1.20.0'
  }
};
```

2. Register in `src/knowledge/core/registry.ts`:
```typescript
import { newNodeSchema } from '../schemas/new-node.js';

export async function initializeCoreSchemas() {
  // ...
  schemaRegistry.registerSchema(newNodeSchema);
}
```

3. Add tests in `__tests__/unit/knowledge/registry.test.ts`

### Adding New Quirks

1. Create quirk file in `src/knowledge/quirks/`:
```typescript
// src/knowledge/quirks/new-quirk.ts
export const newQuirk: Quirk = {
  id: 'new-node-issue',
  title: 'Brief description',
  affectedNodes: ['new'],
  severity: 'critical',
  symptoms: ['Error message 1', 'Error message 2'],
  workaround: 'How to avoid',
  autoFixAvailable: false,
  affectedVersions: {
    nodeTypeVersion: [1, 2],
    n8nVersion: '1.20.0+'
  }
};
```

2. Register in `src/knowledge/core/registry.ts`

3. Add tests

---

## License

MIT

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/anthropics/strange-mcp-n8n/issues
- Documentation: `/docs/`
- Tests: `/__tests__/unit/knowledge/`
