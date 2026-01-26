/**
 * Postgres Node Schema Definition
 *
 * Validated schema for N8N Postgres-node (n8n-nodes-base.postgres) typeVersion 2.
 *
 * Postgres node executes SQL queries against PostgreSQL databases.
 * Supports executeQuery (raw SQL), insert, update, and delete operations.
 *
 * COMMON USE CASES:
 * - Execute complex SQL queries (CTEs, JOINs, aggregations)
 * - Insert/update/delete database records
 * - Parameterized queries for security ($1, $2, $3)
 * - Data analysis with FILTER clauses and aggregations
 *
 * TOKEN EFFICIENCY NOTE:
 * - executeQuery covers 90% of real-world usage
 * - Focus on parameterized query patterns
 * - Other operations (insert/update/delete) use simplified examples
 *
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/
 */

import type { NodeSchema } from '../types.js';

/**
 * Postgres Node Complete Schema
 *
 * Documents the configuration format for PostgreSQL database operations.
 * Primary focus: executeQuery with parameterized queries.
 */
export const postgresNodeSchema: NodeSchema = {
  nodeType: 'postgres',
  n8nType: 'n8n-nodes-base.postgres',
  typeVersion: 2,

  formats: [
    {
      name: 'executeQuery',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        operation: {
          type: 'string',
          enum: ['executeQuery', 'insert', 'update', 'delete'],
          default: 'executeQuery',
          description: 'Database operation to perform',
        },
        query: {
          type: 'string',
          required: true,
          description: 'SQL query to execute. Use $1, $2, $3 for parameters.',
        },
        additionalFields: {
          type: 'object',
          description: 'Optional query configuration',
          properties: {
            queryBatching: {
              type: 'string',
              enum: ['single', 'independently', 'transaction'],
              default: 'single',
              description: 'How to execute query for multiple items',
            },
            connectionTimeout: {
              type: 'number',
              default: 3000,
              description: 'Connection timeout in milliseconds',
            },
          },
        },
      },

      example: {
        minimal: {
          operation: 'executeQuery',
          query: 'SELECT * FROM users WHERE id = $1',
        },

        complete: {
          operation: 'executeQuery',
          query: `SELECT
  s.id, s.title, s.status,
  s.started_at, s.last_activity,
  EXTRACT(DAY FROM now() - s.last_activity) as days_inactive,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_contexts,
  COUNT(DISTINCT c.id) FILTER (WHERE c.context_type = 'blocker' AND c.status = 'active') as blockers
FROM agent.sessions s
LEFT JOIN agent.session_contexts c ON s.id = c.session_id
WHERE s.project_id = $1
  AND s.status = 'active'
GROUP BY s.id, s.title, s.status, s.started_at, s.last_activity
ORDER BY s.last_activity DESC
LIMIT $2`,
          additionalFields: {
            queryBatching: 'single',
            connectionTimeout: 5000,
          },
        },

        with_cte: {
          operation: 'executeQuery',
          query: `WITH session_info AS (
  SELECT id, title, started_at, last_activity
  FROM agent.sessions
  WHERE id = $1
    AND project_id = $2
)
SELECT
  c.context_type, c.title, c.content,
  c.priority, c.created_at
FROM agent.session_contexts c
WHERE c.session_id = $1
  AND c.status = 'active'
ORDER BY c.created_at DESC`,
          additionalFields: {
            queryBatching: 'single',
          },
        },
      },

      notes:
        'Use parameterized queries ($1, $2, $3) to prevent SQL injection. ' +
        'FILTER clause works for conditional aggregations. CTEs (WITH) are supported. ' +
        'COALESCE handles NULL values. Query batching modes: single (all items), ' +
        'independently (one query per item), transaction (atomic batch).',

      editorRequirements: [
        {
          id: 'query_required',
          name: 'SQL Query Required',
          path: 'query',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing query field - SQL query is required',
          severity: 'error',
          rationale: 'Query defines the SQL statement to execute',
          fix: 'Add query: "SELECT * FROM table"',
        },
        {
          id: 'operation_required',
          name: 'Operation Type Required',
          path: 'operation',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing operation field',
          severity: 'error',
          rationale: 'Operation type determines how Postgres node processes the request',
          fix: 'Add operation: "executeQuery"',
        },
        {
          id: 'parameterized_query_best_practice',
          name: 'Use Parameterized Queries',
          path: 'query',
          checkType: 'custom',
          customValidator: (params: any) => {
            const query = params?.query || '';
            // Check if query contains variables but not parameterized
            const hasVariables = query.includes('{{') || query.includes('${');
            const hasParams = /\$\d+/.test(query);
            return !hasVariables || hasParams;
          },
          errorMessage: 'Consider using parameterized queries ($1, $2) instead of inline variables',
          severity: 'warning',
          rationale: 'Parameterized queries prevent SQL injection and improve performance',
          fix: 'Use $1, $2 placeholders and pass values separately',
        },
      ],
    },

    {
      name: 'insert',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        operation: {
          type: 'string',
          const: 'insert',
        },
        schema: {
          type: 'string',
          default: 'public',
          description: 'Database schema name',
        },
        table: {
          type: 'string',
          required: true,
          description: 'Table name',
        },
        columns: {
          type: 'string',
          required: true,
          description: 'Comma-separated column names',
        },
      },

      example: {
        minimal: {
          operation: 'insert',
          table: 'users',
          columns: 'name,email',
        },

        complete: {
          operation: 'insert',
          schema: 'agent',
          table: 'session_contexts',
          columns: 'session_id,context_type,title,content,status,priority',
        },
      },

      notes:
        'Insert operation creates new rows. Use columns field to specify which fields to insert. ' +
        'Data comes from incoming items. For complex inserts, use executeQuery with INSERT statement.',

      editorRequirements: [
        {
          id: 'table_required',
          name: 'Table Name Required',
          path: 'table',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing table field',
          severity: 'error',
          rationale: 'Table name is required for insert operation',
          fix: 'Add table: "table_name"',
        },
      ],
    },

    {
      name: 'update',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        operation: {
          type: 'string',
          const: 'update',
        },
        schema: {
          type: 'string',
          default: 'public',
        },
        table: {
          type: 'string',
          required: true,
        },
        updateKey: {
          type: 'string',
          required: true,
          description: 'Column to match rows (e.g., id)',
        },
        columns: {
          type: 'string',
          required: true,
          description: 'Columns to update',
        },
      },

      example: {
        minimal: {
          operation: 'update',
          table: 'users',
          updateKey: 'id',
          columns: 'name,email',
        },
      },

      notes: 'Update operation modifies existing rows. updateKey defines which column to match on.',

      editorRequirements: [
        {
          id: 'update_key_required',
          name: 'Update Key Required',
          path: 'updateKey',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing updateKey field',
          severity: 'error',
          rationale: 'Update key determines which rows to update',
          fix: 'Add updateKey: "id"',
        },
      ],
    },

    {
      name: 'delete',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        operation: {
          type: 'string',
          const: 'delete',
        },
        schema: {
          type: 'string',
          default: 'public',
        },
        table: {
          type: 'string',
          required: true,
        },
        deleteKey: {
          type: 'string',
          required: true,
          description: 'Column to match rows for deletion',
        },
      },

      example: {
        minimal: {
          operation: 'delete',
          table: 'users',
          deleteKey: 'id',
        },
      },

      notes: 'Delete operation removes rows. Use with caution. For complex deletes, use executeQuery with DELETE statement.',

      editorRequirements: [
        {
          id: 'delete_key_required',
          name: 'Delete Key Required',
          path: 'deleteKey',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing deleteKey field',
          severity: 'error',
          rationale: 'Delete key determines which rows to delete',
          fix: 'Add deleteKey: "id"',
        },
      ],
    },
  ],

  metadata: {
    source: 'n8n_documentation_and_real_world_usage',
    validatedDate: '2026-01-25T04:57:00+07:00',
    validatedBy: 'context_manager_workflows',
    n8nVersion: '1.76.1',
    notes: 'Schema based on Context Manager Bot and Daily Cleanup workflows. Focus on executeQuery (90% usage).',
  },
};
