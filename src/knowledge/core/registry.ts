/**
 * Core Schema Registry
 *
 * Central registry for all validated node schemas. Provides typed access
 * to schema definitions and implements the hybrid storage strategy
 * (core in code, extended in Redis).
 *
 * @module knowledge/core/registry
 * @see docs/KNOWLEDGE-LAYER-ARCHITECTURE.md#recommendation-hybrid-approach
 */

import type { NodeSchema, SchemaListQuery, Quirk } from '../types.js';

/**
 * Core Schema Registry
 *
 * Stores essential node schemas in code for:
 * - Type safety (TypeScript validation)
 * - Fast access (no I/O)
 * - Always available (no external dependencies)
 * - Version controlled (Git)
 */
export class SchemaRegistry {
  private schemas: Map<string, NodeSchema> = new Map();
  private quirks: Map<string, Quirk[]> = new Map();

  /**
   * Register a node schema
   *
   * Called during initialization to populate core schemas.
   */
  registerSchema(schema: NodeSchema): void {
    const key = `${schema.nodeType}:${schema.typeVersion}`;
    this.schemas.set(key, schema);
  }

  /**
   * Register a quirk
   *
   * Associates quirk with affected node types.
   */
  registerQuirk(quirk: Quirk): void {
    for (const nodeType of quirk.affectedNodes) {
      // Extract simplified node type from "n8n-nodes-base.if" -> "if"
      const simpleType = nodeType.split('.').pop() || nodeType;

      const existing = this.quirks.get(simpleType) || [];
      existing.push(quirk);
      this.quirks.set(simpleType, existing);
    }
  }

  /**
   * Get schema by node type
   *
   * @param nodeType - Simplified node type (e.g., "if", "switch")
   * @param typeVersion - Optional version (defaults to 1)
   * @returns Node schema or null if not found
   */
  getSchema(nodeType: string, typeVersion: number = 1): NodeSchema | null {
    const key = `${nodeType}:${typeVersion}`;
    return this.schemas.get(key) || null;
  }

  /**
   * Get all registered schemas
   *
   * @param query - Optional filter criteria
   * @returns Array of matching schemas
   */
  listSchemas(query?: SchemaListQuery): NodeSchema[] {
    let schemas = Array.from(this.schemas.values());

    if (query?.status) {
      schemas = schemas.filter((schema) =>
        schema.formats.some((format) => format.status === query.status)
      );
    }

    // Note: category filtering would require adding category to NodeSchema type
    // Deferring to future iteration

    return schemas;
  }

  /**
   * Get quirks for node type
   *
   * @param nodeType - Simplified node type
   * @returns Array of quirks affecting this node
   */
  getQuirks(nodeType: string): Quirk[] {
    return this.quirks.get(nodeType) || [];
  }

  /**
   * Get all registered quirks
   */
  listAllQuirks(): Quirk[] {
    const allQuirks: Quirk[] = [];
    for (const quirks of this.quirks.values()) {
      allQuirks.push(...quirks);
    }

    // Deduplicate by ID
    const uniqueMap = new Map<string, Quirk>();
    for (const quirk of allQuirks) {
      uniqueMap.set(quirk.id, quirk);
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Search quirks by symptoms
   *
   * Useful for diagnosing unknown issues.
   *
   * @param symptoms - Array of symptom keywords
   * @returns Quirks matching any of the symptoms
   */
  searchQuirksBySymptoms(symptoms: string[]): Quirk[] {
    const allQuirks = this.listAllQuirks();
    const lowerSymptoms = symptoms.map((s) => s.toLowerCase());

    return allQuirks.filter((quirk) =>
      quirk.symptoms.some((symptom) =>
        lowerSymptoms.some((search) => symptom.toLowerCase().includes(search))
      )
    );
  }
}

/**
 * Global schema registry instance
 *
 * Singleton pattern for consistent access across the application.
 */
export const schemaRegistry = new SchemaRegistry();

/**
 * Initialize core schemas
 *
 * Called on server startup to populate registry with essential schemas.
 * Import and register individual node schemas here.
 */
export async function initializeCoreSchemas(): Promise<void> {
  // Import schemas - Logic nodes
  const { ifNodeSchema } = await import('../schemas/if-node.js');
  const { switchNodeSchema } = await import('../schemas/switch-node.js');
  const { filterNodeSchema } = await import('../schemas/filter-node.js');

  // Import schemas - Trigger nodes
  const { webhookNodeSchema } = await import('../schemas/webhook-node.js');
  const { manualTriggerNodeSchema } = await import('../schemas/manual-trigger-node.js');
  const { scheduleTriggerNodeSchema } = await import('../schemas/schedule-trigger-node.js');

  // Import schemas - Integration nodes
  const { httpRequestNodeSchema } = await import('../schemas/http-request-node.js');
  const { postgresNodeSchema } = await import('../schemas/postgres-node.js');

  // Import schemas - Output nodes
  const { respondNodeSchema } = await import('../schemas/respond-node.js');

  // Import schemas - Data transformation nodes
  const { codeNodeSchema } = await import('../schemas/code-node.js');
  const { setNodeSchema } = await import('../schemas/set-node.js');
  const { mergeNodeSchema } = await import('../schemas/merge-node.js');

  // Import quirks
  const { ifNodeQuirks } = await import('../quirks/if-node.js');

  // Register schemas - Logic nodes
  schemaRegistry.registerSchema(ifNodeSchema);
  schemaRegistry.registerSchema(switchNodeSchema);
  schemaRegistry.registerSchema(filterNodeSchema);

  // Register schemas - Trigger nodes
  schemaRegistry.registerSchema(webhookNodeSchema);
  schemaRegistry.registerSchema(manualTriggerNodeSchema);
  schemaRegistry.registerSchema(scheduleTriggerNodeSchema);

  // Register schemas - Integration nodes
  schemaRegistry.registerSchema(httpRequestNodeSchema);
  schemaRegistry.registerSchema(postgresNodeSchema);

  // Register schemas - Output nodes
  schemaRegistry.registerSchema(respondNodeSchema);

  // Register schemas - Data transformation nodes
  schemaRegistry.registerSchema(codeNodeSchema);
  schemaRegistry.registerSchema(setNodeSchema);
  schemaRegistry.registerSchema(mergeNodeSchema);

  // Register quirks
  ifNodeQuirks.forEach((quirk) => schemaRegistry.registerQuirk(quirk));

  console.log('✅ Knowledge Layer initialized: 12 schemas, 1 quirk registered');
}
