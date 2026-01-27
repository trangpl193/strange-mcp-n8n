/**
 * Switch Node Quirks Database
 *
 * Documents known API/UI mismatches for N8N Switch-node.
 *
 * @see /home/strange/.user/conversation/25-1-2026.md
 */

import type { Quirk } from '../types.js';

/**
 * Quirk: Switch-node typeVersion 1 is DEPRECATED and BROKEN
 *
 * CRITICAL: typeVersion 1 has incompatible parameter formats that cause UI rendering issues.
 * Modern n8n (v1.20.0+) uses typeVersion 3.4 with completely different structure.
 *
 * Discovery Context:
 * - Issue reported on 2026-01-25: Context Manager Bot workflow blank canvas
 * - Investigation showed typeVersion 1 formats don't render in modern UI
 * - User provided working samples from workflow euW7tBP1ddy1W2Zo (2026-01-27)
 * - Working samples all use typeVersion 3.4 with different parameter structure
 *
 * typeVersion 1 Problems:
 * - expression + multipleOutputs format: uses output="multipleOutputs" + rules.rules[]
 * - rules mode: uses rules.values[] WITHOUT condition IDs (missing UUIDs)
 * - UI cannot render without condition IDs, shows blank canvas or errors
 *
 * typeVersion 3.4 Solution:
 * - rules mode: uses rules.values[] WITH condition IDs (UUID required for each)
 * - expression mode: uses numberOutputs parameter (not output="multipleOutputs")
 * - Full structure documented in docs/SWITCH_NODE_FORMATS.md
 */
export const switchNodeTripleFormatQuirk: Quirk = {
  id: 'switch-node-typeversion-1-deprecated',
  title: 'Switch-node typeVersion 1 is DEPRECATED - Use typeVersion 3.4',

  affectedNodes: ['n8n-nodes-base.switch'],
  affectedVersions: {
    nodeTypeVersion: [1],
    n8nVersion: ['1.20.0+'], // Modern n8n requires v3.4
  },

  severity: 'critical',

  description:
    'Switch-node typeVersion 1 is DEPRECATED in modern n8n (v1.20.0+). ' +
    'typeVersion 3.4 is required for proper UI rendering. ' +
    'typeVersion 1 formats (expression+multipleOutputs with rules.rules[], or rules.values without condition IDs) ' +
    'cause "Could not find property option" errors and blank workflow canvas. ' +
    'MCP tools must use typeVersion 3.4 with proper format: rules mode requires rules.values[] with UUID for each condition, ' +
    'expression mode requires numberOutputs parameter (not output="multipleOutputs").',

  symptoms: [
    'Workflow commits successfully (HTTP 200 response)',
    'Workflow appears in N8N workflow list',
    'Opening workflow shows blank/empty canvas (all nodes invisible)',
    'Browser console error: "Could not find property option" OR "Could not find workflow"',
    'Switch-node settings panel shows error or missing configuration',
    'Workflow execution may fail or produce unexpected routing behavior',
    'All downstream nodes from Switch are not visible in UI',
  ],

  rootCause:
    'N8N updated Switch-node from typeVersion 1 to 3.4 with breaking parameter structure changes: ' +
    '- typeVersion 1 rules.values[] did not require condition IDs → UI cannot render ' +
    '- typeVersion 1 expression mode used output="multipleOutputs" → deprecated ' +
    '- typeVersion 3.4 rules.values[] REQUIRES unique UUID for each condition → UI renders correctly ' +
    '- typeVersion 3.4 expression mode uses numberOutputs parameter → new standard ' +
    'MCP tool default was typeVersion 1 causing all generated workflows to break. ' +
    'Fix: Update node-mappings.ts to typeVersion 3.4 and builder to generate correct format with condition IDs.',

  workaround:
    'ALWAYS use typeVersion 3.4 for Switch nodes. Two valid formats: ' +
    '1. Rules mode: { rules: { values: [...] } } where each condition has unique id (UUID). ' +
    '   Include conditions.options with version: 3. ' +
    '2. Expression mode: { mode: "expression", numberOutputs: <number> }. ' +
    'MCP tools automatically generate correct format via applySwitchNodeV3Format(). ' +
    'See docs/SWITCH_NODE_FORMATS.md and src/knowledge/schemas/switch-node-v3.ts for complete specification.',

  autoFixAvailable: true,

  discoveredDate: '2026-01-25T13:49:00+07:00',
  fixedIn: null,

  relatedQuirks: [
    'if-node-dual-format', // Similar issue with conditional node formats
  ],

  references: [
    '/home/strange/.user/conversation/25-1-2026.md',
    '/home/strange/projects/strange-mcp-n8n/src/knowledge/schemas/switch-node.ts',
    'Workflow c5oHF5bn1SJARsfd (UAT S2: Conditional Routing) - Working example',
    'Workflow jckoh1tV8qFoYrAo (Context Manager Bot v2) - Initially broken, fixed',
  ],
};

/**
 * All Switch-node quirks
 */
export const switchNodeQuirks: Quirk[] = [switchNodeTripleFormatQuirk];
