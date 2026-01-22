/**
 * Knowledge Layer Public API
 *
 * Exports all knowledge layer types and utilities.
 * This is the main entry point for consuming knowledge layer functionality.
 *
 * @module knowledge
 */

// Core types
export type {
  NodeSchema,
  SchemaFormat,
  SchemaMetadata,
  WorkflowExample,
  NodeExample,
  ConnectionExample,
  ExampleMetadata,
  Quirk,
  ValidationError,
  ValidationWarning,
  SchemaValidationResult,
  QuirkAutoFixResult,
  ExampleSearchQuery,
  SchemaListQuery,
} from './types.js';

// Core registry
export { SchemaRegistry, schemaRegistry, initializeCoreSchemas } from './core/registry.js';

// Schemas (re-export for direct access if needed)
export { ifNodeSchema } from './schemas/if-node.js';
export { switchNodeSchema } from './schemas/switch-node.js';
export { filterNodeSchema } from './schemas/filter-node.js';

// Quirks
export { ifNodeQuirks, ifNodeDualFormatQuirk } from './quirks/if-node.js';
