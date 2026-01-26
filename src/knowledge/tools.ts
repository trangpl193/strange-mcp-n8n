/**
 * Knowledge Layer MCP Tools
 *
 * Provides MCP tool implementations for accessing the Knowledge Layer.
 * These tools enable AI agents to query schemas, quirks, and validate workflows.
 *
 * @module knowledge/tools
 */

import { schemaRegistry } from './core/registry.js';
import type {
  NodeSchema,
  SchemaSummary,
  Quirk,
  SchemaValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';

/**
 * schema_get() - Get node schema information
 *
 * Returns validated schema formats for specified node type.
 * Use this to understand correct parameter structure before creating nodes.
 *
 * @param nodeType - Simplified node type (e.g., "if", "switch", "filter")
 * @param typeVersion - Optional version number (defaults to 1)
 * @returns NodeSchema with all valid formats
 * @throws Error if node type not found
 *
 * @example
 * ```typescript
 * const schema = await schema_get('if');
 * // Returns: If-node schema with combinator and legacy_options formats
 *
 * const recommended = schema.formats.find(f => f.status === 'recommended');
 * // Use recommended format for creating nodes
 * ```
 */
export async function schema_get(
  nodeType: string,
  typeVersion?: number
): Promise<NodeSchema> {
  const version = typeVersion ?? 1;
  const schema = schemaRegistry.getSchema(nodeType, version);

  if (!schema) {
    throw new Error(
      `Schema not found for node type: ${nodeType} (version ${version}). ` +
        `Available types: ${schemaRegistry.listSchemas().map((s) => s.nodeType).join(', ')}`
    );
  }

  return schema;
}

/**
 * schema_list() - List all available node schemas
 *
 * Returns schema information from the knowledge library.
 * Use summary mode for discovery (lightweight, ~95% token reduction).
 * Use full mode when you need complete schema details.
 *
 * @param options - Optional filter and display options
 * @param options.status - Filter by format status
 * @param options.summary - Return lightweight summary (default: false)
 * @returns Array of NodeSchema or SchemaSummary objects
 *
 * @example
 * ```typescript
 * // Lightweight summary for discovery (RECOMMENDED)
 * const summary = await schema_list({ summary: true });
 * // Returns: [{ nodeType: "if", formatNames: ["hybrid", "pure_combinator"], ... }]
 * // Size: ~170 tokens (vs ~3,170 tokens for full schemas)
 *
 * // Full schemas when you need complete details
 * const allSchemas = await schema_list();
 * // Returns: Full NodeSchema[] with examples, editorRequirements, etc.
 *
 * // Filter by status
 * const recommended = await schema_list({ status: 'recommended', summary: true });
 * ```
 */
export async function schema_list(options?: {
  status?: 'recommended' | 'deprecated' | 'experimental';
  summary?: boolean;
}): Promise<NodeSchema[] | SchemaSummary[]> {
  const schemas = schemaRegistry.listSchemas(options);

  // Return lightweight summary if requested (95% token reduction)
  if (options?.summary) {
    return schemas.map((s): SchemaSummary => ({
      nodeType: s.nodeType,
      n8nType: s.n8nType,
      typeVersion: s.typeVersion,
      formatNames: s.formats.map((f) => f.name),
      recommendedFormat: s.formats.find((f) => f.status === 'recommended')?.name ?? null,
      hasQuirks: s.formats.some((f) => f.status === 'deprecated'),
      formatCount: s.formats.length,
    }));
  }

  // Return full schemas
  return schemas;
}

/**
 * quirks_check() - Check for known quirks
 *
 * Returns quirks affecting specified node type.
 * AI should call this before creating nodes to avoid known issues.
 *
 * @param nodeType - Simplified node type
 * @param typeVersion - Optional version number
 * @returns Array of Quirk objects
 *
 * @example
 * ```typescript
 * const quirks = await quirks_check('if');
 * // Returns: [{ id: 'if-node-dual-format', severity: 'critical', ... }]
 *
 * const critical = quirks.filter(q => q.severity === 'critical');
 * // Filter to only critical issues
 * ```
 */
export async function quirks_check(
  nodeType: string,
  typeVersion?: number
): Promise<Quirk[]> {
  const quirks = schemaRegistry.getQuirks(nodeType);

  // Filter by typeVersion if specified
  if (typeVersion !== undefined) {
    return quirks.filter((quirk) =>
      quirk.affectedVersions.nodeTypeVersion.includes(typeVersion)
    );
  }

  return quirks;
}

/**
 * quirks_search() - Search quirks by symptoms
 *
 * Find quirks matching error symptoms.
 * Useful for diagnosing unknown issues.
 *
 * @param symptoms - Array of symptom keywords to search for
 * @returns Array of matching Quirk objects
 *
 * @example
 * ```typescript
 * const quirks = await quirks_search(['empty canvas', 'could not find']);
 * // Returns: Quirks with matching symptoms (e.g., if-node-dual-format)
 * ```
 */
export async function quirks_search(symptoms: string[]): Promise<Quirk[]> {
  return schemaRegistry.searchQuirksBySymptoms(symptoms);
}

/**
 * schema_validate() - Validate node parameters against schema
 *
 * Checks if provided parameters match any valid format for the node type.
 * Returns validation errors, warnings, and suggestions for fixes.
 *
 * @param nodeType - Simplified node type
 * @param parameters - Node parameters to validate
 * @param typeVersion - Optional version number
 * @returns Validation result with errors, warnings, and suggestions
 *
 * @example
 * ```typescript
 * const result = await schema_validate('if', {
 *   conditions: {
 *     options: {},  // Wrong format
 *     string: [...]
 *   }
 * });
 *
 * // Returns: {
 * //   valid: false,
 * //   matchedFormat: 'legacy_options',
 * //   warnings: [{
 * //     message: "Format 'legacy_options' is deprecated and UI-incompatible",
 * //     suggestion: "Use 'combinator' format instead"
 * //   }]
 * // }
 * ```
 */
export async function schema_validate(
  nodeType: string,
  parameters: Record<string, unknown>,
  typeVersion?: number
): Promise<SchemaValidationResult> {
  const schema = await schema_get(nodeType, typeVersion);

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let matchedFormat: string | undefined;
  let valid = false;
  let editorCompatible = false;
  const editorIssues: import('./types.js').EditorRequirement[] = [];

  // Try to match parameters against each format
  for (const format of schema.formats) {
    const match = validateAgainstFormat(parameters, format);

    if (match.matches) {
      matchedFormat = format.name;
      valid = true;

      // ✨ NEW: Validate editor requirements (Tier 2)
      if (format.editorRequirements) {
        const editorValidation = validateEditorRequirements(
          parameters,
          format.editorRequirements,
          typeVersion
        );

        editorCompatible = editorValidation.compatible;

        // Add errors for failed requirements
        for (const failed of editorValidation.failed) {
          if (failed.severity === 'error') {
            errors.push({
              path: failed.path,
              message: failed.errorMessage,
              expected: failed.expected,
            });
            editorIssues.push(failed);
          } else {
            warnings.push({
              path: failed.path,
              message: failed.errorMessage,
              suggestion: failed.fix,
            });
          }
        }
      } else {
        // No editor requirements defined = assume compatible if format is UI-compatible
        editorCompatible = format.uiCompatible;
      }

      // Add warnings for deprecated or UI-incompatible formats
      if (format.status === 'deprecated') {
        warnings.push({
          path: '',
          message: `Format '${format.name}' is deprecated`,
          suggestion: `Use '${schema.formats.find((f) => f.status === 'recommended')?.name}' format instead`,
        });
      }

      if (!format.uiCompatible) {
        warnings.push({
          path: '',
          message: `Format '${format.name}' is not UI-compatible. N8N UI cannot render this format.`,
          suggestion: `Use a UI-compatible format like '${schema.formats.find((f) => f.uiCompatible)?.name}'`,
        });
      }

      break; // Found a match
    }
  }

  if (!valid) {
    errors.push({
      path: '',
      message: `Parameters do not match any known format for ${nodeType}`,
      expected: schema.formats.map((f) => f.name),
      actual: parameters,
    });
  }

  return {
    valid: valid && editorCompatible, // ✨ Must pass both format AND editor checks
    matchedFormat,
    errors,
    warnings,
    editorCompatible,
    editorIssues: editorIssues.length > 0 ? editorIssues : undefined,
    suggestion: errors.length > 0
      ? `Review schema formats and editor requirements`
      : undefined,
  };
}

/**
 * Helper: Validate parameters against a specific format
 *
 * Basic structural validation - checks if key paths exist.
 * Future: Can be enhanced with JSON Schema validation.
 *
 * @internal
 */
function validateAgainstFormat(
  parameters: Record<string, unknown>,
  format: import('./types.js').SchemaFormat
): { matches: boolean } {
  // Basic heuristic validation based on format name
  // This is a simplified implementation - can be enhanced with proper JSON Schema validation

  if (format.name === 'hybrid') {
    // If-node hybrid format (typeVersion 2)
    const conditions = parameters.conditions as any;
    if (
      conditions?.options &&
      conditions?.combinator &&
      Array.isArray(conditions?.conditions) &&
      parameters.options !== undefined
    ) {
      return { matches: true };
    }
  }

  if (format.name === 'combinator' || format.name === 'pure_combinator') {
    // If-node combinator format
    const conditions = parameters.conditions as any;
    if (conditions?.combinator && Array.isArray(conditions?.conditions)) {
      return { matches: true };
    }
  }

  if (format.name === 'legacy_options') {
    // If-node legacy format
    const conditions = parameters.conditions as any;
    if (conditions?.options || conditions?.string || conditions?.number) {
      return { matches: true };
    }
  }

  if (format.name === 'rules') {
    // Switch-node rules format
    const rules = parameters.rules as any;
    if (parameters.mode === 'rules' && rules?.values) {
      return { matches: true };
    }
  }

  if (format.name === 'expression') {
    // Switch-node expression format
    if (parameters.mode === 'expression' && parameters.output) {
      return { matches: true };
    }
  }

  if (format.name === 'conditions') {
    // Filter-node conditions format
    const conditions = parameters.conditions as any;
    if (conditions?.combinator && Array.isArray(conditions?.conditions)) {
      return { matches: true };
    }
  }

  if (format.name === 'webhook') {
    // Webhook-node format - requires path field
    if (parameters.path) {
      return { matches: true };
    }
  }

  if (format.name === 'respond') {
    // Respond-node format - has respondWith field
    if (parameters.respondWith !== undefined) {
      return { matches: true };
    }
  }

  if (format.name === 'http_request') {
    // HTTP Request node format - requires url field
    if (parameters.url) {
      return { matches: true };
    }
  }

  if (format.name === 'code') {
    // Code-node format - requires mode, language, and code field
    if (parameters.mode && parameters.language) {
      const lang = parameters.language as string;
      if (
        (lang === 'javaScript' && parameters.jsCode) ||
        (lang === 'python' && parameters.pythonCode)
      ) {
        return { matches: true };
      }
    }
  }

  if (format.name === 'manual_mapping') {
    // Set-node manual mapping format - requires mode and assignments
    const assignments = parameters.assignments as any;
    if (
      parameters.mode === 'manual' &&
      assignments?.assignments &&
      Array.isArray(assignments.assignments)
    ) {
      return { matches: true };
    }
  }

  if (format.name === 'executeQuery') {
    // Postgres-node executeQuery format - requires operation and query
    if (
      parameters.operation === 'executeQuery' &&
      typeof parameters.query === 'string'
    ) {
      return { matches: true };
    }
  }

  if (format.name === 'insert') {
    // Postgres-node insert format - requires operation, table, and columns
    if (
      parameters.operation === 'insert' &&
      typeof parameters.table === 'string' &&
      typeof parameters.columns === 'string'
    ) {
      return { matches: true };
    }
  }

  if (format.name === 'update') {
    // Postgres-node update format - requires operation, table, updateKey, and columns
    if (
      parameters.operation === 'update' &&
      typeof parameters.table === 'string' &&
      typeof parameters.updateKey === 'string' &&
      typeof parameters.columns === 'string'
    ) {
      return { matches: true };
    }
  }

  if (format.name === 'delete') {
    // Postgres-node delete format - requires operation, table, and deleteKey
    if (
      parameters.operation === 'delete' &&
      typeof parameters.table === 'string' &&
      typeof parameters.deleteKey === 'string'
    ) {
      return { matches: true };
    }
  }

  return { matches: false };
}

/**
 * Validate parameters against editor requirements
 * @internal
 * @since Tier 2 Enhancement (2026-01-24)
 */
function validateEditorRequirements(
  parameters: Record<string, unknown>,
  requirements: import('./types.js').EditorRequirement[],
  typeVersion?: number
): {
  compatible: boolean;
  failed: import('./types.js').EditorRequirement[];
} {
  const failed: import('./types.js').EditorRequirement[] = [];

  for (const req of requirements) {
    let passes = false;

    if (req.checkType === 'exists') {
      passes = hasPath(parameters, req.path);
      if (passes && req.expected?.type) {
        const value = getPath(parameters, req.path);
        passes =
          typeof value === req.expected.type ||
          (req.expected.type === 'array' && Array.isArray(value));
      }
      if (passes && req.expected?.minLength !== undefined) {
        const value = getPath(parameters, req.path);
        if (Array.isArray(value)) {
          passes = value.length >= req.expected.minLength;
        }
      }
    } else if (req.checkType === 'value') {
      const value = getPath(parameters, req.path);
      passes = value === req.expected?.value;
    } else if (req.checkType === 'type') {
      const value = getPath(parameters, req.path);
      passes = typeof value === req.expected?.type;
    } else if (req.checkType === 'custom' && req.customValidator) {
      passes = req.customValidator(parameters);
    }

    if (!passes) {
      failed.push(req);
    }
  }

  return {
    compatible: failed.filter((f) => f.severity === 'error').length === 0,
    failed,
  };
}

/**
 * Helper: Check if path exists in object
 * Supports nested paths like "conditions.options" and array notation "conditions.conditions[].id"
 * @internal
 */
function hasPath(obj: any, path: string): boolean {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (part.endsWith('[]')) {
      // Array element check
      const arrayPath = part.slice(0, -2);
      if (!current[arrayPath] || !Array.isArray(current[arrayPath])) {
        return false;
      }
      // For array notation, we just verify array exists
      // Actual element check happens in custom validators
      current = current[arrayPath];
    } else {
      if (current[part] === undefined) {
        return false;
      }
      current = current[part];
    }
  }

  return true;
}

/**
 * Helper: Get value at path
 * @internal
 */
function getPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (part.endsWith('[]')) {
      const arrayPath = part.slice(0, -2);
      current = current[arrayPath];
    } else {
      current = current?.[part];
    }
  }

  return current;
}
