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
 * Returns summary of all nodes in the knowledge library.
 * Useful for discovering what schemas are available.
 *
 * @param filter - Optional filter criteria
 * @returns Array of NodeSchema objects
 *
 * @example
 * ```typescript
 * const allSchemas = await schema_list();
 * // Returns: All registered schemas
 *
 * const recommended = await schema_list({ status: 'recommended' });
 * // Returns: Only schemas with recommended formats
 * ```
 */
export async function schema_list(filter?: {
  status?: 'recommended' | 'deprecated' | 'experimental';
}): Promise<NodeSchema[]> {
  return schemaRegistry.listSchemas(filter);
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

  // Try to match parameters against each format
  for (const format of schema.formats) {
    const match = validateAgainstFormat(parameters, format);

    if (match.matches) {
      matchedFormat = format.name;
      valid = true;

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
    valid,
    matchedFormat,
    errors,
    warnings,
    suggestion: errors.length > 0
      ? `Review schema formats: ${schema.formats.map((f) => f.name).join(', ')}`
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

  if (format.name === 'combinator') {
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

  return { matches: false };
}
