/**
 * Simplified workflow schema for AI input
 * Reduces token usage and complexity
 */

export interface SimplifiedWorkflow {
  name: string;
  description?: string;
  steps: SimplifiedStep[];
}

export interface SimplifiedStep {
  type: string;                    // Simplified type: "webhook", "postgres", "http", "if", "set"
  name?: string;                   // Optional name (auto-generated if missing)
  action?: string;                 // For nodes with multiple actions (e.g., "insert", "select")
  config?: Record<string, any>;    // Type-specific configuration
  credential?: string;             // Credential name (will be resolved to ID)
  next?: string | string[];        // Connection target(s) by step name
}

/**
 * Example simplified workflow:
 *
 * {
 *   "name": "Export Figma Variables",
 *   "description": "Export variables from Figma to database",
 *   "steps": [
 *     {
 *       "type": "webhook",
 *       "config": {
 *         "path": "/figma-export",
 *         "method": "POST"
 *       }
 *     },
 *     {
 *       "type": "postgres",
 *       "action": "insert",
 *       "credential": "prod-db",
 *       "config": {
 *         "table": "variables",
 *         "columns": "name,value,type"
 *       }
 *     },
 *     {
 *       "type": "respond",
 *       "config": {
 *         "statusCode": 200,
 *         "body": "{ \"success\": true }"
 *       }
 *     }
 *   ]
 * }
 */
