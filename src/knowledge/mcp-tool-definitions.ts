/**
 * Knowledge Layer MCP Tool Definitions
 *
 * Defines MCP tool schemas for registering with the MCP server.
 * These definitions provide AI agents with typed interfaces for knowledge layer access.
 *
 * @module knowledge/mcp-tool-definitions
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * schema_get - Get node schema information
 */
export const schemaGetTool: Tool = {
  name: 'schema_get',
  description:
    'Get validated schema information for a specific N8N node type. ' +
    'Returns all valid parameter formats, compatibility information, and examples. ' +
    'Use this before creating nodes to understand the correct structure.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeType: {
        type: 'string',
        description:
          'Simplified node type identifier (e.g., "if", "switch", "filter")',
      },
      typeVersion: {
        type: 'number',
        description: 'Node type version number (optional, defaults to 1)',
      },
    },
    required: ['nodeType'],
  },
};

/**
 * schema_list - List all available schemas
 */
export const schemaListTool: Tool = {
  name: 'schema_list',
  description:
    'List all available node schemas in the knowledge library. ' +
    'Useful for discovering what schemas are documented and available.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['recommended', 'deprecated', 'experimental'],
        description: 'Filter by format status (optional)',
      },
    },
  },
};

/**
 * quirks_check - Check for known quirks
 */
export const quirksCheckTool: Tool = {
  name: 'quirks_check',
  description:
    'Check for known API/UI behavior mismatches (quirks) affecting a specific node type. ' +
    'Returns quirks with severity levels, symptoms, workarounds, and auto-fix availability. ' +
    'IMPORTANT: Always call this before creating nodes to avoid known issues.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeType: {
        type: 'string',
        description: 'Simplified node type identifier (e.g., "if", "switch")',
      },
      typeVersion: {
        type: 'number',
        description: 'Node type version number (optional)',
      },
    },
    required: ['nodeType'],
  },
};

/**
 * quirks_search - Search quirks by symptoms
 */
export const quirksSearchTool: Tool = {
  name: 'quirks_search',
  description:
    'Search for quirks by matching error symptoms or keywords. ' +
    'Useful when diagnosing unknown issues or debugging workflow problems. ' +
    'Example symptoms: "empty canvas", "could not find", "rendering error"',
  inputSchema: {
    type: 'object',
    properties: {
      symptoms: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Array of symptom keywords to search for (e.g., ["empty", "canvas"])',
      },
    },
    required: ['symptoms'],
  },
};

/**
 * schema_validate - Validate node parameters
 */
export const schemaValidateTool: Tool = {
  name: 'schema_validate',
  description:
    'Validate node parameters against known schema formats. ' +
    'Checks if parameters match any valid format and returns errors/warnings. ' +
    'Detects deprecated formats and UI-incompatible structures. ' +
    'Use before committing workflows to prevent rendering issues.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeType: {
        type: 'string',
        description: 'Simplified node type identifier',
      },
      parameters: {
        type: 'object',
        description: 'Node parameters to validate (JSON object)',
      },
      typeVersion: {
        type: 'number',
        description: 'Node type version number (optional)',
      },
    },
    required: ['nodeType', 'parameters'],
  },
};

/**
 * All knowledge layer MCP tools
 */
export const knowledgeLayerTools: Tool[] = [
  schemaGetTool,
  schemaListTool,
  quirksCheckTool,
  quirksSearchTool,
  schemaValidateTool,
];
