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
