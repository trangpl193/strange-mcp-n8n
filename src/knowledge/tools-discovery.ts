/**
 * Knowledge Layer Discovery Tools (Tier 1)
 *
 * Provides minimal, token-efficient discovery endpoints for AI agents.
 * Part of Progressive Loading Architecture to prevent session state overflow.
 *
 * Design principle: Return only IDs and minimal metadata (~200 tokens),
 * forcing explicit schema_get() calls for details.
 *
 * @module knowledge/tools-discovery
 */

import { schemaRegistry } from './core/registry.js';

/**
 * Minimal schema information for discovery
 * Token budget: ~25 tokens per schema × 8 schemas = ~200 tokens total
 */
export interface SchemaDiscoveryItem {
  nodeType: string; // Simplified identifier (e.g., "if", "switch")
  n8nType: string; // Full N8N type (e.g., "n8n-nodes-base.if")
  formatCount: number; // Number of parameter formats available
  hasQuirks: boolean; // Whether this node has known UI/API quirks
}

/**
 * schema_discover() - Tier 1: Discovery
 *
 * Returns minimal list of available schemas for discovery.
 * AI agents use this to understand what schemas exist, then call
 * schema_get(id) for details on specific schemas.
 *
 * Token budget: ~200 tokens (vs 16k for schema_list with full data)
 * Reduction: 99% token savings
 *
 * @returns Array of minimal schema information
 *
 * @example
 * ```typescript
 * // Discovery pattern (token-efficient)
 * const available = await schema_discover();
 * // Returns: 8 schemas, ~200 tokens
 *
 * // Then get details for specific schema
 * const ifSchema = await schema_get('if');
 * // Returns: Full schema, ~4k tokens
 * ```
 */
export async function schema_discover(): Promise<SchemaDiscoveryItem[]> {
  const schemas = schemaRegistry.listSchemas();

  return schemas.map((s) => ({
    nodeType: s.nodeType,
    n8nType: s.n8nType,
    formatCount: s.formats.length,
    hasQuirks: s.formats.some((f) => f.status === 'deprecated'),
  }));
}
