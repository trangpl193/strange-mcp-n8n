/**
 * Knowledge Layer Type Definitions
 *
 * Provides type-safe interfaces for N8N node schemas, quirks database,
 * and working examples library. Enables AI agents to validate workflows
 * before committing to N8N.
 *
 * @module knowledge/types
 * @see docs/KNOWLEDGE-LAYER-ARCHITECTURE.md
 */

/**
 * Node Schema - Ground truth for N8N node structures
 *
 * Represents validated schema information for a specific N8N node type.
 * Includes all valid formats, compatibility information, and examples.
 */
export interface NodeSchema {
  /**
   * Simplified node type identifier
   * @example "if", "switch", "filter"
   */
  nodeType: string;

  /**
   * Full N8N node type identifier
   * @example "n8n-nodes-base.if"
   */
  n8nType: string;

  /**
   * Node type version number
   * Different versions may have different parameter schemas
   */
  typeVersion: number;

  /**
   * All valid schema formats for this node
   * May include recommended, deprecated, and experimental formats
   */
  formats: SchemaFormat[];

  /**
   * Metadata about schema validation and source
   */
  metadata: SchemaMetadata;
}

/**
 * Editor Requirement - UI-specific validation rule
 *
 * Documents requirements that N8N UI editor needs to render correctly.
 * Goes beyond API acceptance to ensure UI compatibility.
 *
 * @since Tier 2 Enhancement (2026-01-24)
 */
export interface EditorRequirement {
  /**
   * Unique requirement identifier
   * @example "conditions_options_wrapper"
   */
  id: string;

  /**
   * Human-readable name
   * @example "Conditions Options Wrapper Required"
   */
  name: string;

  /**
   * JSON path to check
   * @example "conditions.options"
   * @example "conditions.conditions[].id" (for array element checks)
   */
  path: string;

  /**
   * Validation check type
   * - exists: Check if path exists
   * - type: Check if value is of expected type
   * - value: Check if value equals expected value
   * - custom: Use custom validator function
   */
  checkType: 'exists' | 'type' | 'value' | 'custom';

  /**
   * Expected value or type constraints
   */
  expected?: {
    type?: 'object' | 'array' | 'string' | 'number' | 'boolean';
    value?: unknown;
    minLength?: number;
    pattern?: string;
  };

  /**
   * Custom validation function (for complex checks)
   * Return true if validation passes
   */
  customValidator?: (params: Record<string, unknown>) => boolean;

  /**
   * Error message if validation fails
   * @example "Missing conditions.options wrapper - required for editor rendering"
   */
  errorMessage: string;

  /**
   * How critical is this requirement?
   * - error: Will break UI rendering (show as error)
   * - warning: May cause issues (show as warning)
   */
  severity: 'error' | 'warning';

  /**
   * Why is this required?
   * Technical explanation of why N8N UI needs this
   * @example "N8N UI editor uses options wrapper to store condition state"
   */
  rationale: string;

  /**
   * How to fix if failing
   * @example "Add conditions.options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }"
   */
  fix?: string;
}

/**
 * Schema Format - Specific parameter structure variant
 *
 * N8N nodes can have multiple valid parameter formats (e.g., If-node has
 * "combinator" and "legacy_options" formats). This type documents each variant.
 */
export interface SchemaFormat {
  /**
   * Format identifier
   * @example "combinator", "legacy_options", "simplified"
   */
  name: string;

  /**
   * Format recommendation status
   * - recommended: Use this format (UI-compatible, current)
   * - deprecated: Avoid this format (API accepts but may break UI)
   * - experimental: New format, not yet stable
   */
  status: 'recommended' | 'deprecated' | 'experimental';

  /**
   * Will N8N UI render this format correctly?
   * false = "Could not find property" errors in UI
   */
  uiCompatible: boolean;

  /**
   * Will N8N API accept this format?
   * false = API will reject with 400 error
   */
  apiCompatible: boolean;

  /**
   * JSON Schema-like structure definition
   * Documents the expected parameter shape
   */
  structure: Record<string, unknown>;

  /**
   * Example configurations demonstrating this format
   */
  example: {
    /**
     * Simplest valid configuration
     * Minimal parameters required for this format to work
     */
    minimal: Record<string, unknown>;

    /**
     * Full-featured configuration
     * Shows all available options and advanced usage
     */
    complete: Record<string, unknown>;
  };

  /**
   * Additional context about this format
   * @example "This is the format used by N8N UI. Always prefer this."
   */
  notes?: string;

  /**
   * Editor-specific validation rules
   * Documents UI requirements beyond basic format matching
   * @since Tier 2 Enhancement (2026-01-24)
   */
  editorRequirements?: EditorRequirement[];
}

/**
 * Schema Metadata - Validation and source information
 */
export interface SchemaMetadata {
  /**
   * How was this schema obtained?
   * - ui_created: Extracted from UI-created workflow
   * - documentation: From N8N official docs
   * - reverse_engineered: Discovered through testing
   */
  source: 'ui_created' | 'documentation' | 'reverse_engineered';

  /**
   * When was this schema last validated?
   * ISO 8601 timestamp
   */
  validatedDate: string;

  /**
   * Who validated this schema?
   * @example "uat_testing", "manual_verification", "automated_test"
   */
  validatedBy: string;

  /**
   * N8N version this schema was tested against
   * @example "1.20.0"
   */
  n8nVersion: string;
}

/**
 * Workflow Example - Validated working workflow
 *
 * Represents a complete N8N workflow known to render correctly in UI.
 * Used as reference for correct node parameter structures.
 */
export interface WorkflowExample {
  /**
   * N8N workflow ID
   * @example "p0wuASUdgvHj9jxj"
   */
  id: string;

  /**
   * Descriptive workflow name
   * @example "Working If-Node Example - Price Check"
   */
  name: string;

  /**
   * Tags for categorization and search
   * @example ["if-node", "conditional", "number-comparison"]
   */
  tags: string[];

  /**
   * What problem does this workflow solve?
   * @example "Route items based on price threshold"
   */
  useCase: string;

  /**
   * Workflow nodes with annotations
   */
  nodes: NodeExample[];

  /**
   * Node connections
   */
  connections: ConnectionExample[];

  /**
   * Validation metadata
   */
  metadata: ExampleMetadata;

  /**
   * Additional context about this example
   */
  notes?: string;
}

/**
 * Node Example - Annotated node configuration
 */
export interface NodeExample {
  /**
   * N8N node type
   * @example "n8n-nodes-base.if"
   */
  type: string;

  /**
   * Node display name
   * @example "Check Status"
   */
  name: string;

  /**
   * Complete node parameters
   * This is the validated structure that works in UI
   */
  parameters: Record<string, unknown>;

  /**
   * Human-readable explanation of this node
   * @example "Example of combinator format"
   */
  annotation: string;

  /**
   * Key parameter paths to highlight
   * @example ["conditions.combinator: 'or'", "operator.type = 'number'"]
   */
  highlights: string[];
}

/**
 * Connection Example - Node connection definition
 */
export interface ConnectionExample {
  /**
   * Source node name
   */
  from: string;

  /**
   * Target node name
   */
  to: string;

  /**
   * Source output index (default: 0)
   */
  fromOutput: number;

  /**
   * Target input index (default: 0)
   */
  toInput: number;
}

/**
 * Example Metadata - Validation and status information
 */
export interface ExampleMetadata {
  /**
   * How was this workflow created?
   * - ui_created: Created in N8N UI
   * - builder_created: Created via MCP builder
   */
  source: 'ui_created' | 'builder_created';

  /**
   * When was this workflow validated?
   * ISO 8601 timestamp
   */
  validatedDate: string;

  /**
   * Who validated this workflow?
   */
  validatedBy: string;

  /**
   * N8N version where workflow was tested
   */
  n8nVersion: string;

  /**
   * Current working status
   * - confirmed: Known to work correctly in UI
   * - suspected: Likely works but not fully tested
   * - broken: Known to have rendering issues
   */
  workingStatus: 'confirmed' | 'suspected' | 'broken';
}

/**
 * Quirk - Known API/UI behavior mismatch
 *
 * Documents known issues where N8N API accepts parameters but UI
 * fails to render correctly. Includes workarounds and auto-fix suggestions.
 */
export interface Quirk {
  /**
   * Unique quirk identifier
   * @example "if-node-dual-format"
   */
  id: string;

  /**
   * Human-readable title
   * @example "If-node has two incompatible schema formats"
   */
  title: string;

  /**
   * Node types affected by this quirk
   * @example ["n8n-nodes-base.if"]
   */
  affectedNodes: string[];

  /**
   * Version information
   */
  affectedVersions: {
    /**
     * Node type versions affected
     * @example [1]
     */
    nodeTypeVersion: number[];

    /**
     * N8N versions affected
     * @example ["*"] for all versions, or specific versions
     */
    n8nVersion: string[];
  };

  /**
   * How critical is this quirk?
   * - critical: Will break UI rendering
   * - warning: May cause issues in some cases
   * - info: Minor inconsistency, no breaking impact
   */
  severity: 'critical' | 'warning' | 'info';

  /**
   * Full explanation of the quirk
   * Describe what happens and why
   */
  description: string;

  /**
   * What symptoms will user see?
   * @example ["Empty workflow canvas", "Console error: Could not find property"]
   */
  symptoms: string[];

  /**
   * Why does this quirk occur?
   * Technical explanation of the root cause
   */
  rootCause: string;

  /**
   * How to avoid this quirk?
   * Recommended approach to prevent the issue
   */
  workaround: string;

  /**
   * Can MCP auto-fix this quirk?
   * If true, quirks_autofix() tool can transform parameters
   */
  autoFixAvailable: boolean;

  /**
   * When was this quirk discovered?
   * ISO 8601 timestamp
   */
  discoveredDate: string;

  /**
   * N8N version that fixes this quirk
   * null if not yet fixed
   */
  fixedIn: string | null;

  /**
   * Related quirk IDs
   * @example ["switch-node-similar-issue"]
   */
  relatedQuirks: string[];

  /**
   * Documentation references
   * File paths, URLs, issue links
   */
  references: string[];
}

/**
 * Validation Error - Schema validation failure
 */
export interface ValidationError {
  /**
   * JSON path to the error location
   * @example "conditions.options"
   */
  path: string;

  /**
   * Error message
   * @example "Property 'options' is not valid for combinator format"
   */
  message: string;

  /**
   * Expected value or structure
   */
  expected?: unknown;

  /**
   * Actual value provided
   */
  actual?: unknown;
}

/**
 * Validation Warning - Non-critical issue
 */
export interface ValidationWarning {
  /**
   * JSON path to the warning location
   */
  path: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * How to fix this warning
   */
  suggestion?: string;
}

/**
 * Schema Validation Result
 */
export interface SchemaValidationResult {
  /**
   * Is the configuration valid?
   * True only if format matches AND editor requirements pass
   * @since Tier 2: Changed to require both format AND editor validation
   */
  valid: boolean;

  /**
   * Which schema format matched?
   * @example "combinator", "legacy_options"
   */
  matchedFormat?: string;

  /**
   * Validation errors (breaking issues)
   */
  errors: ValidationError[];

  /**
   * Validation warnings (non-breaking issues)
   */
  warnings: ValidationWarning[];

  /**
   * How to fix if invalid
   */
  suggestion?: string;

  /**
   * Will N8N UI editor render this correctly?
   * True if all editor requirements pass (or no requirements defined)
   * @since Tier 2 Enhancement (2026-01-24)
   */
  editorCompatible: boolean;

  /**
   * Editor requirements that failed validation
   * Only present if editorCompatible is false
   * @since Tier 2 Enhancement (2026-01-24)
   */
  editorIssues?: EditorRequirement[];
}

/**
 * Quirk Auto-Fix Result
 */
export interface QuirkAutoFixResult {
  /**
   * Fixed parameter structure
   * Ready to use in node configuration
   */
  fixedParameters: Record<string, unknown>;

  /**
   * Explanation of what was changed
   * @example "Transformed legacy format to UI-compatible combinator format"
   */
  explanation: string;
}

/**
 * Example Search Query
 */
export interface ExampleSearchQuery {
  /**
   * Filter by node type
   * @example "if"
   */
  nodeType?: string;

  /**
   * Filter by tags
   * @example ["webhook", "postgres"]
   */
  tags?: string[];

  /**
   * Free text search in use case
   */
  useCase?: string;

  /**
   * Only return confirmed working examples?
   */
  confirmedOnly?: boolean;
}

/**
 * Schema List Query
 */
export interface SchemaListQuery {
  /**
   * Filter by node category
   */
  category?: 'trigger' | 'action' | 'conditional' | 'transform';

  /**
   * Filter by format status
   */
  status?: 'recommended' | 'deprecated' | 'experimental';
}
