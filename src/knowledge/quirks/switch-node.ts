/**
 * Switch Node Quirks Database
 *
 * Documents known API/UI mismatches for N8N Switch-node.
 *
 * @see /home/strange/.user/conversation/25-1-2026.md
 */

import type { Quirk } from '../types.js';

/**
 * Quirk: Switch-node triple format incompatibility
 *
 * CRITICAL: N8N Switch-node accepts three parameter formats via API, but only
 * one format (expression + multipleOutputs) reliably works in UI. Using the wrong
 * format causes workflow to commit successfully but break in UI rendering.
 *
 * Discovery Context:
 * - Issue reported on 2026-01-25
 * - Context Manager Bot workflow created via builder using "rules.values" format
 * - Workflow committed successfully (HTTP 200)
 * - Opening in UI showed blank canvas
 * - Console error: "Could not find property option" / "Could not find workflow"
 * - Test workflows 2, 4, 5 all failed with same issue
 * - UAT workflow (c5oHF5bn1SJARsfd) uses "expression + multipleOutputs" format and works
 * - Investigation revealed schema knowledge documented wrong format
 */
export const switchNodeTripleFormatQuirk: Quirk = {
  id: 'switch-node-triple-format',
  title: 'Switch-node has three formats but only expression+multipleOutputs works in UI',

  affectedNodes: ['n8n-nodes-base.switch'],
  affectedVersions: {
    nodeTypeVersion: [1],
    n8nVersion: ['*'], // All versions tested
  },

  severity: 'critical',

  description:
    'Switch-node (typeVersion 1) accepts three different parameter formats via API: ' +
    '"rules" (with rules.values), "expression" (simple string), and "expression + multipleOutputs" ' +
    '(with rules.rules). N8N API accepts ALL formats without error (returns HTTP 200), but N8N UI ' +
    'only renders "expression + multipleOutputs" format correctly. Using "rules.values" format ' +
    'causes "Could not find property option" / "Could not find workflow" error and results in ' +
    'blank workflow canvas in UI.',

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
    'N8N UI code expects specific structure for Switch-node depending on mode: ' +
    '1. "rules" mode with rules.values (OLD format) - NOT UI-compatible despite being in schema ' +
    '2. "expression" mode with simple output string (LIMITED - works but only for simple routing) ' +
    '3. "expression" mode with output="multipleOutputs" + rules.rules + outputKey (CORRECT format) ' +
    'Schema documentation and builder were using format #1 which N8N API accepts but UI cannot render. ' +
    'The correct format for builder usage is #3: mode="expression", output="multipleOutputs", ' +
    'rules.rules (not rules.values!), with outputKey for each branch. This is the format UAT workflows use.',

  workaround:
    'Always use "expression + multipleOutputs" format for Switch-node with multiple conditional outputs. ' +
    'Structure must be: { mode: "expression", output: "multipleOutputs", rules: { rules: [ { outputKey: "...", ' +
    'conditions: { combinator: "and/or", conditions: [...] } } ] } }. Note: rules.rules NOT rules.values! ' +
    'Builder must transform simplified input to this structure. See src/knowledge/schemas/switch-node.ts ' +
    'format "expression-multipleOutputs" for complete specification.',

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
