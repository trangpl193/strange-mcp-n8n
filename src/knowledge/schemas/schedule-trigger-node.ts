/**
 * Schedule Trigger Node Schema Definition
 *
 * Validated schema for N8N Schedule Trigger node (n8n-nodes-base.scheduleTrigger) typeVersion 1.
 *
 * Schedule Trigger executes workflows on a recurring schedule using cron expressions or
 * simple intervals. Critical for automation workflows.
 *
 * COMMON USE CASES:
 * - Daily data backups and cleanup tasks
 * - Hourly monitoring and health checks
 * - Weekly report generation
 * - Periodic API polling and synchronization
 *
 * TOKEN EFFICIENCY NOTE:
 * Focus on most common patterns: cron expressions and intervals.
 * Real-world usage primarily uses these two modes.
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/
 */

import type { NodeSchema } from '../types.js';

/**
 * Schedule Trigger Node Complete Schema
 *
 * Documents the configuration format for scheduled workflow execution.
 * Supports cron expressions, intervals, and specific times.
 */
export const scheduleTriggerNodeSchema: NodeSchema = {
  nodeType: 'schedule',
  n8nType: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1,

  formats: [
    {
      name: 'cron_expression',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          const: 'cronExpression',
          description: 'Use cron expression for scheduling',
        },
        cronExpression: {
          type: 'string',
          required: true,
          description: 'Cron expression (e.g., "0 0 * * *" for daily at midnight)',
        },
        triggerTimes: {
          type: 'object',
          description: 'Timezone configuration',
          properties: {
            mode: {
              type: 'string',
              enum: ['everyMinute', 'everyHour', 'everyDay', 'custom'],
              default: 'custom',
            },
          },
        },
      },

      example: {
        minimal: {
          mode: 'cronExpression',
          cronExpression: '0 0 * * *',
        },

        complete: {
          mode: 'cronExpression',
          cronExpression: '0 2 * * *', // Daily at 2 AM with all trigger options
          triggerTimes: {
            mode: 'everyDay',
          },
        },
      },

      notes:
        'Cron expression format: minute hour day month weekday. ' +
        'Examples: "0 0 * * *" (daily midnight), "*/15 * * * *" (every 15 min), ' +
        '"0 9 * * 1" (Mondays 9am). Use https://crontab.guru for validation.',

      editorRequirements: [
        {
          id: 'cron_expression_required',
          name: 'Cron Expression Required',
          path: 'cronExpression',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing cronExpression field',
          severity: 'error',
          rationale: 'Cron expression defines when workflow executes',
          fix: 'Add cronExpression: "0 0 * * *" (or your desired schedule)',
        },
        {
          id: 'mode_required',
          name: 'Mode Field Required',
          path: 'mode',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing mode field',
          severity: 'error',
          rationale: 'Mode determines scheduling method',
          fix: 'Add mode: "cronExpression"',
        },
      ],
    },

    {
      name: 'interval',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        mode: {
          type: 'string',
          const: 'interval',
          description: 'Use simple interval for scheduling',
        },
        interval: {
          type: 'number',
          required: true,
          description: 'Interval in minutes between executions',
        },
        unit: {
          type: 'string',
          enum: ['minutes', 'hours', 'days'],
          default: 'minutes',
          description: 'Time unit for interval',
        },
      },

      example: {
        minimal: {
          mode: 'interval',
          interval: 60,
        },

        complete: {
          mode: 'interval',
          interval: 1,
          unit: 'hours',
        },
      },

      notes:
        'Interval mode is simpler than cron for regular recurring tasks. ' +
        'Good for monitoring, polling APIs, periodic checks. ' +
        'For complex schedules (e.g., weekdays only), use cron expression.',

      editorRequirements: [
        {
          id: 'interval_required',
          name: 'Interval Value Required',
          path: 'interval',
          checkType: 'exists',
          expected: { type: 'number' },
          errorMessage: 'Missing interval field',
          severity: 'error',
          rationale: 'Interval defines execution frequency',
          fix: 'Add interval: 60 (minutes)',
        },
        {
          id: 'mode_interval',
          name: 'Mode Must Be Interval',
          path: 'mode',
          checkType: 'exists',
          expected: { type: 'string' },
          errorMessage: 'Missing or incorrect mode field',
          severity: 'error',
          rationale: 'Mode must be "interval" for interval-based scheduling',
          fix: 'Add mode: "interval"',
        },
      ],
    },
  ],

  metadata: {
    source: 'documentation',
    validatedDate: '2026-01-25T12:47:00+07:00',
    validatedBy: 'automation_workflows',
    n8nVersion: '1.76.1',
  },
};
