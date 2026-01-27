/**
 * Schema Integration Layer
 *
 * Bridges canonical tool definitions with the MCP SDK,
 * automatically selecting the appropriate schema adapter
 * based on detected API target.
 */

import {
  SchemaTransformer,
  AnthropicAdapter,
  GeminiAdapter,
  detectTargetAPI,
  type TargetAPI,
  type FlatteningHint,
} from '@trangpl193/mcp-core';
import { allTools } from './tool-definitions.js';

// Singleton transformer with both adapters registered
let transformer: SchemaTransformer | null = null;

/**
 * Get or create the schema transformer
 */
export function getTransformer(): SchemaTransformer {
  if (!transformer) {
    transformer = new SchemaTransformer();
    transformer.registerAdapter(new AnthropicAdapter());
    transformer.registerAdapter(new GeminiAdapter());
  }
  return transformer;
}

/**
 * Detect target API from environment or default to Gemini
 * (since we know Claude Code uses Gemini-compatible schemas)
 */
export function detectAPI(): TargetAPI {
  return detectTargetAPI({
    envOverride: process.env.MCP_TARGET_API,
  }, 'gemini'); // Default to Gemini for safety
}

/**
 * Get flattening hints for a tool
 */
export function getToolHints(toolName: string): FlatteningHint[] {
  const t = getTransformer();
  return t.getToolHints(toolName);
}

/**
 * Parse input from flattened format back to canonical format
 */
export function parseToolInput(
  toolName: string,
  input: Record<string, unknown>
): Record<string, unknown> {
  const t = getTransformer();
  const target = detectAPI();
  return t.parseInput(toolName, input, target);
}

/**
 * Transform all tools for the target API
 * Call this at startup to pre-compute transformations
 */
export function initializeSchemas(): void {
  const t = getTransformer();
  const target = detectAPI();

  console.log(`📐 Initializing schemas for target API: ${target}`);

  for (const tool of allTools) {
    t.transformTool(tool, target);
  }

  console.log(`📐 Transformed ${allTools.length} tool definitions`);
}

/**
 * Get transformed tool definition for a specific tool
 */
export function getTransformedTool(toolName: string): unknown {
  const t = getTransformer();
  const target = detectAPI();
  const tool = allTools.find(t => t.name === toolName);

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return t.transformTool(tool, target).definition;
}

/**
 * Export all tool definitions
 */
export { allTools } from './tool-definitions.js';
