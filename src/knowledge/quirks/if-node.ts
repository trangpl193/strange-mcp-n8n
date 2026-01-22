/**
 * If Node Quirks Database
 *
 * Documents known API/UI mismatches for N8N If-node.
 *
 * @see /home/strange/projects/strange-mcp-n8n/UAT-RESULTS-2026-01-22.md
 */

import type { Quirk } from '../types.js';

/**
 * Quirk: If-node dual format incompatibility
 *
 * CRITICAL: N8N If-node accepts two parameter formats via API, but only
 * one format works in UI. Using the wrong format causes workflow to commit
 * successfully but break in UI rendering.
 *
 * Discovery Context:
 * - UAT testing on 2026-01-22
 * - Builder created workflow using "legacy_options" format
 * - Workflow committed successfully (HTTP 200)
 * - Opening in UI showed empty canvas
 * - Console error: "Could not find property option"
 * - UI-created workflow (p0wuASUdgvHj9jxj) uses "combinator" format and works
 */
export const ifNodeDualFormatQuirk: Quirk = {
  id: 'if-node-dual-format',
  title: 'If-node has two incompatible schema formats',

  affectedNodes: ['n8n-nodes-base.if'],
  affectedVersions: {
    nodeTypeVersion: [1],
    n8nVersion: ['*'], // All versions tested
  },

  severity: 'critical',

  description:
    'If-node (typeVersion 1) accepts two different parameter formats via API: ' +
    '"combinator" and "legacy_options". N8N API accepts BOTH formats without ' +
    'error (returns HTTP 200), but N8N UI only renders "combinator" format correctly. ' +
    'Using "legacy_options" format causes "Could not find property option" error ' +
    'and results in empty workflow canvas in UI.',

  symptoms: [
    'Workflow commits successfully (HTTP 200 response)',
    'Workflow appears in N8N workflow list',
    'Opening workflow shows empty canvas (no nodes visible)',
    'Browser console error: "Could not find property option"',
    'If-node settings panel shows error or missing configuration',
    'Workflow execution may work but UI is completely broken',
  ],

  rootCause:
    'N8N UI code expects "combinator + conditions[]" structure but legacy API ' +
    'documentation shows "options + string[]" structure. Both are technically valid ' +
    'in N8N database schema and API accepts both, but UI rendering code only handles ' +
    'combinator format. The legacy_options format appears to be from older N8N versions ' +
    'or incomplete API documentation.',

  workaround:
    'Always use "combinator" format for If-node. Before committing workflow, transform ' +
    'any simplified builder input to combinator structure. See src/schema/node-defaults/if-node.ts ' +
    'for automatic transformation logic. Builder pattern must apply these defaults before ' +
    'calling N8N API.',

  autoFixAvailable: true,

  discoveredDate: '2026-01-22T14:00:00+07:00',
  fixedIn: null,

  relatedQuirks: [
    // Will be added as more conditional nodes are tested
    // 'switch-node-similar-issue',
    // 'filter-node-conditions-format'
  ],

  references: [
    '/home/strange/projects/strange-mcp-n8n/UAT-RESULTS-2026-01-22.md',
    '/home/strange/projects/strange-mcp-n8n/src/schema/node-defaults/if-node.ts',
    '/home/strange/projects/strange-mcp-n8n/__tests__/unit/schema/node-defaults/if-node.test.ts',
  ],
};

/**
 * All If-node quirks
 */
export const ifNodeQuirks: Quirk[] = [ifNodeDualFormatQuirk];
