import { McpError, McpErrorCode } from '@strange/mcp-core';
import type { SimplifiedWorkflow, SimplifiedStep } from '../schemas/simplified-workflow.js';
import { getNodeMapping, NODE_MAPPINGS } from '../schemas/node-mappings.js';
import type { N8NWorkflow, N8NNode, N8NConnections } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transform simplified workflow to full N8N workflow JSON
 */
export class WorkflowTransformer {
  private credentialMap: Map<string, string>;

  /**
   * @param credentialMap - Map of credential name → credential ID
   */
  constructor(credentialMap: Map<string, string> = new Map()) {
    this.credentialMap = credentialMap;
  }

  /**
   * Transform simplified workflow to N8N format
   */
  transform(simplified: SimplifiedWorkflow): Partial<N8NWorkflow> {
    const nodes: N8NNode[] = [];
    const connections: N8NConnections = {};
    const nameToId = new Map<string, string>();

    // Generate nodes
    simplified.steps.forEach((step, index) => {
      const node = this.transformStep(step, index);
      nodes.push(node);

      const stepName = step.name || `Step ${index + 1}`;
      nameToId.set(stepName, node.name);
    });

    // Generate connections
    simplified.steps.forEach((step, index) => {
      if (step.next) {
        const sourceNodeName = nodes[index].name;
        const targets = Array.isArray(step.next) ? step.next : [step.next];

        connections[sourceNodeName] = {
          main: [
            targets.map(targetName => {
              const targetNodeName = nameToId.get(targetName) || targetName;
              return {
                node: targetNodeName,
                type: 'main' as const,
                index: 0,
              };
            }),
          ],
        };
      } else if (index < simplified.steps.length - 1) {
        // Auto-connect to next step
        const sourceNodeName = nodes[index].name;
        const targetNodeName = nodes[index + 1].name;

        connections[sourceNodeName] = {
          main: [[{
            node: targetNodeName,
            type: 'main' as const,
            index: 0,
          }]],
        };
      }
    });

    return {
      name: simplified.name,
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1',
      },
    };
  }

  /**
   * Transform single step to N8N node
   */
  private transformStep(step: SimplifiedStep, index: number): N8NNode {
    const mapping = getNodeMapping(step.type);

    if (!mapping) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        `Unknown node type: ${step.type}`,
        { details: { availableTypes: Object.keys(NODE_MAPPINGS) } }
      );
    }

    const nodeName = step.name || this.generateNodeName(step.type, index);

    // Auto-layout: horizontal spacing
    const positionX = 250 + (index * 200);
    const positionY = 300;

    // Build node
    const node: N8NNode = {
      id: uuidv4(),
      name: nodeName,
      type: mapping.n8nType,
      typeVersion: mapping.typeVersion,
      position: [positionX, positionY],
      parameters: {
        ...mapping.defaultParams,
        ...step.config,
      },
    };

    // Add credentials if specified
    if (step.credential) {
      const credentialId = this.resolveCredential(step.credential, mapping.n8nType);

      // Extract credential type from n8nType
      // e.g., "n8n-nodes-base.postgres" → "postgresApi"
      const credentialType = this.getCredentialType(mapping.n8nType);

      node.credentials = {
        [credentialType]: {
          id: credentialId,
          name: step.credential,
        },
      };
    }

    return node;
  }

  /**
   * Resolve credential name to ID
   */
  private resolveCredential(credentialName: string, nodeType: string): string {
    const credentialId = this.credentialMap.get(credentialName);

    if (!credentialId) {
      throw new McpError(
        McpErrorCode.INVALID_PARAMS,
        `Credential not found: ${credentialName}`,
        {
          details: {
            nodeType,
            availableCredentials: Array.from(this.credentialMap.keys()),
            hint: 'Ensure credential name matches exactly or provide credential ID mapping',
          },
        }
      );
    }

    return credentialId;
  }

  /**
   * Extract credential type from node type
   * Maps N8N node type to credential type name
   */
  private getCredentialType(n8nType: string): string {
    // Map common node types to credential types
    const credentialTypeMap: Record<string, string> = {
      'n8n-nodes-base.postgres': 'postgresApi',
      'n8n-nodes-base.discord': 'discordApi',
      'n8n-nodes-base.httpRequest': 'httpBasicAuth',
      'n8n-nodes-base.slack': 'slackApi',
      'n8n-nodes-base.github': 'githubApi',
    };

    return credentialTypeMap[n8nType] || 'default';
  }

  /**
   * Generate node name from type
   */
  private generateNodeName(type: string, index: number): string {
    const baseName = type.charAt(0).toUpperCase() + type.slice(1);
    return index === 0 ? baseName : `${baseName} ${index + 1}`;
  }
}
