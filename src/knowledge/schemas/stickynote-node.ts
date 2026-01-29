/**
 * Sticky Note Node Schema Definition
 *
 * Validated schema for N8N Sticky Note (n8n-nodes-base.stickyNote) typeVersion 1.
 *
 * Sticky notes are documentation nodes that provide context, instructions, and
 * architectural decisions directly in the workflow canvas.
 *
 * COMMON USE CASES:
 * - Workflow changelog and version history
 * - Usage instructions for other developers
 * - Architecture decisions and trade-offs
 * - Debug notes and troubleshooting guides
 * - Team collaboration notes
 *
 * BEST PRACTICES:
 * - Use templates (changelog, usage, architecture) for consistency
 * - Keep notes concise and focused
 * - Update notes when workflow changes
 * - Position notes near related nodes
 *
 * @see Phase 1.5: Note CRUD Implementation
 */

import type { NodeSchema } from '../types.js';

/**
 * Sticky Note Complete Schema
 *
 * Documents the configuration format for workflow documentation notes.
 * Supports markdown content, customizable size, and template expansion.
 */
export const stickyNoteSchema: NodeSchema = {
  nodeType: 'stickyNote',
  n8nType: 'n8n-nodes-base.stickyNote',
  typeVersion: 1,

  formats: [
    {
      name: 'stickyNote',
      status: 'recommended',
      uiCompatible: true,
      apiCompatible: true,

      structure: {
        content: {
          type: 'string',
          required: true,
          default: '## Documentation\n\nAdd your notes here...',
          description: 'Markdown content for the note. Supports basic markdown formatting.',
        },
        height: {
          type: 'number',
          default: 300,
          description: 'Note height in pixels. Range: 80-2000. Recommended: 300-400.',
        },
        width: {
          type: 'number',
          default: 400,
          description: 'Note width in pixels. Range: 150-2000. Recommended: 400-600.',
        },
      },

      example: {
        minimal: {
          content: '## Workflow Notes\n\nThis workflow processes user data.',
        },

        complete: {
          content:
            '## Changelog\n\n' +
            '### v1.0.0 - 2026-01-29\n' +
            '**Changes:**\n' +
            '- Initial implementation\n' +
            '- Added data validation\n' +
            '\n' +
            '**Modified By**: Team Lead\n' +
            '**Reason**: Feature request #123',
          height: 400,
          width: 500,
        },

        withTemplate: {
          content:
            '## Usage Instructions\n\n' +
            '**Trigger**: Webhook POST /api/users\n' +
            '**Input**: { "name": "string", "email": "string" }\n' +
            '**Output**: { "userId": "uuid", "status": "created" }\n' +
            '\n' +
            '**Error Handling**:\n' +
            '- 400: Invalid input\n' +
            '- 409: User already exists',
          height: 350,
          width: 450,
        },
      },

      notes:
        'Sticky notes do not execute and are purely for documentation. ' +
        'They are not connected to other nodes in the workflow. ' +
        'Content supports markdown: headers (##), bullets (-), bold (**text**), code (`code`). ' +
        'Templates (changelog, usage, architecture) available via builder pattern or note tools.',

      editorRequirements: [
        {
          id: 'content_required',
          name: 'Content Required',
          path: 'content',
          checkType: 'exists',
          expected: { type: 'string', minLength: 1 },
          errorMessage: 'Sticky note content cannot be empty',
          severity: 'error',
          rationale: 'Empty notes provide no value and clutter the canvas',
          fix: 'Add meaningful content to the note',
        },
        {
          id: 'size_reasonable',
          name: 'Reasonable Size',
          path: ['height', 'width'],
          checkType: 'range',
          expected: { height: [80, 2000], width: [150, 2000] },
          errorMessage: 'Note size out of reasonable range',
          severity: 'warning',
          rationale: 'Very small notes are hard to read, very large notes clutter canvas',
          fix: 'Use height: 300-400, width: 400-600 for readability',
        },
      ],
    },
  ],

  metadata: {
    source: 'implementation',
    validatedDate: '2026-01-29T15:00:00+07:00',
    validatedBy: 'phase_1_5_implementation',
    n8nVersion: '1.76.1',
    relatedPhases: ['Phase 1: Helpers', 'Phase 1.5: MCP Tools', 'Phase 2: Builder Pattern'],
  },
};
