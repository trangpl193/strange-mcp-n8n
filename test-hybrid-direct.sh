#!/bin/bash
# Direct test using N8N API to verify HYBRID format
# Creates workflow using builder logic but commits directly to N8N

set -e

N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNmJkOTA2Yy1jMzhmLTQ5N2UtYWEwYy0zNjE5OGE2ZDI2ZjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4ODA3NzI4fQ.CaG50Lh4WVyMkiVovhvgqBxXn1vQ_fEn-MfZNTpinUo"
N8N_URL="https://n8n.strangematic.com/api/v1"

echo "=== Creating workflow with HYBRID IF node via N8N API ==="
echo ""

# Create workflow with HYBRID format IF node
WORKFLOW_JSON='{
  "name": "UAT HYBRID Format Direct Test",
  "nodes": [
    {
      "id": "webhook-node",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "hybrid-direct-test",
        "responseMode": "onReceived"
      }
    },
    {
      "id": "if-node",
      "name": "IF",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [460, 300],
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition1",
              "leftValue": "={{ $json.status }}",
              "rightValue": "success",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "IF",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}'

echo "Creating workflow..."
RESPONSE=$(curl -s -X POST "$N8N_URL/workflows" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d "$WORKFLOW_JSON")

WORKFLOW_ID=$(echo "$RESPONSE" | jq -r '.data.id')

if [ "$WORKFLOW_ID" = "null" ] || [ -z "$WORKFLOW_ID" ]; then
  echo "❌ Failed to create workflow"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Workflow created: $WORKFLOW_ID"
echo ""

# Retrieve and verify
echo "=== Verifying HYBRID format ==="
WORKFLOW=$(curl -s -X GET "$N8N_URL/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY")

echo "$WORKFLOW" | jq '.data.nodes[] | select(.type == "n8n-nodes-base.if")' > "/tmp/if-node-$WORKFLOW_ID.json"

TYPE_VERSION=$(cat "/tmp/if-node-$WORKFLOW_ID.json" | jq '.typeVersion')
HAS_OPTIONS_WRAPPER=$(cat "/tmp/if-node-$WORKFLOW_ID.json" | jq '.parameters.conditions.options != null')
HAS_CONDITION_ID=$(cat "/tmp/if-node-$WORKFLOW_ID.json" | jq '.parameters.conditions.conditions[0].id != null')
HAS_ROOT_OPTIONS=$(cat "/tmp/if-node-$WORKFLOW_ID.json" | jq '.parameters.options != null')

echo "✓ typeVersion = 2: $([ "$TYPE_VERSION" = "2" ] && echo "✅ PASS" || echo "❌ FAIL (got $TYPE_VERSION)")"
echo "✓ conditions.options wrapper: $([ "$HAS_OPTIONS_WRAPPER" = "true" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "✓ conditions[].id field: $([ "$HAS_CONDITION_ID" = "true" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "✓ parameters.options: $([ "$HAS_ROOT_OPTIONS" = "true" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo ""

echo "✅ Workflow ID: $WORKFLOW_ID"
echo "🌐 UI: https://n8n.strangematic.com/workflow/$WORKFLOW_ID"
echo ""
echo "👉 Please check N8N UI to verify the workflow renders correctly!"
