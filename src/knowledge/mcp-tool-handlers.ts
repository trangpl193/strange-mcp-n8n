/**
 * Knowledge Layer MCP Tool Handlers
 *
 * Implements MCP tool call handlers for the knowledge layer.
 * Bridges MCP protocol with knowledge layer implementation.
 *
 * @module knowledge/mcp-tool-handlers
 */

import {
  schema_get,
  schema_list,
  quirks_check,
  quirks_search,
  schema_validate,
} from './tools.js';

/**
 * Handle schema_get tool call
 */
export async function handleSchemaGet(args: {
  nodeType: string;
  typeVersion?: number;
}): Promise<unknown> {
  try {
    const schema = await schema_get(args.nodeType, args.typeVersion);
    return { success: true, schema };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle schema_list tool call
 */
export async function handleSchemaList(args?: {
  status?: 'recommended' | 'deprecated' | 'experimental';
  summary?: boolean;
}): Promise<unknown> {
  try {
    const schemas = await schema_list(args);
    return { success: true, schemas, count: schemas.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle quirks_check tool call
 */
export async function handleQuirksCheck(args: {
  nodeType: string;
  typeVersion?: number;
}): Promise<unknown> {
  try {
    const quirks = await quirks_check(args.nodeType, args.typeVersion);

    return {
      success: true,
      quirks,
      count: quirks.length,
      hasCritical: quirks.some((q) => q.severity === 'critical'),
      hasWarnings: quirks.some((q) => q.severity === 'warning'),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle quirks_search tool call
 */
export async function handleQuirksSearch(args: {
  symptoms: string[];
}): Promise<unknown> {
  try {
    const quirks = await quirks_search(args.symptoms);

    return {
      success: true,
      quirks,
      count: quirks.length,
      searchedSymptoms: args.symptoms,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle schema_validate tool call
 */
export async function handleSchemaValidate(args: {
  nodeType: string;
  parameters: Record<string, unknown>;
  typeVersion?: number;
}): Promise<unknown> {
  try {
    const result = await schema_validate(
      args.nodeType,
      args.parameters,
      args.typeVersion
    );

    return {
      success: true,
      validation: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
