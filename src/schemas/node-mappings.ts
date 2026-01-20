/**
 * Node type mappings from simplified to N8N format
 * Maps simplified type → {n8nType, typeVersion, defaultParams}
 */

export interface NodeMapping {
  n8nType: string;
  typeVersion: number;
  category: 'trigger' | 'action' | 'logic' | 'transform';
  defaultParams?: Record<string, any>;
}

/**
 * Common node type mappings
 */
export const NODE_MAPPINGS: Record<string, NodeMapping> = {
  // Triggers
  webhook: {
    n8nType: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    category: 'trigger',
    defaultParams: {
      httpMethod: 'POST',
      responseMode: 'onReceived',
    },
  },

  schedule: {
    n8nType: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1,
    category: 'trigger',
  },

  manual: {
    n8nType: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    category: 'trigger',
  },

  // Actions
  http: {
    n8nType: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    category: 'action',
    defaultParams: {
      method: 'GET',
    },
  },

  postgres: {
    n8nType: 'n8n-nodes-base.postgres',
    typeVersion: 2,
    category: 'action',
  },

  discord: {
    n8nType: 'n8n-nodes-base.discord',
    typeVersion: 2,
    category: 'action',
    defaultParams: {
      resource: 'message',
    },
  },

  respond: {
    n8nType: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1,
    category: 'action',
    defaultParams: {
      respondWith: 'json',
      responseBody: '={{ $json }}',
    },
  },

  // Logic
  if: {
    n8nType: 'n8n-nodes-base.if',
    typeVersion: 1,
    category: 'logic',
  },

  switch: {
    n8nType: 'n8n-nodes-base.switch',
    typeVersion: 1,
    category: 'logic',
  },

  merge: {
    n8nType: 'n8n-nodes-base.merge',
    typeVersion: 2,
    category: 'logic',
  },

  // Transform
  set: {
    n8nType: 'n8n-nodes-base.set',
    typeVersion: 3,
    category: 'transform',
  },

  code: {
    n8nType: 'n8n-nodes-base.code',
    typeVersion: 2,
    category: 'transform',
    defaultParams: {
      language: 'javascript',
      mode: 'runOnceForAllItems',
    },
  },
};

/**
 * Get N8N type mapping for simplified type
 */
export function getNodeMapping(simplifiedType: string): NodeMapping | null {
  return NODE_MAPPINGS[simplifiedType.toLowerCase()] || null;
}
