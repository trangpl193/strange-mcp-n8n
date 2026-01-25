#!/bin/bash
# Test HYBRID format transformation for IF node
# This script tests the builder with the corrected IF node schema

API_KEY="mcp_a38e0558e20d832ad0c0c48eec5434f3"
BASE_URL="http://localhost:3302/mcp"

echo "=== Testing HYBRID Format Transformation ==="
echo ""

# Step 1: Start builder session
echo "1. Starting builder session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "builder_start",
      "arguments": {
        "name": "UAT HYBRID Format Test",
        "description": "Testing IF node HYBRID format transformation"
      }
    },
    "id": 1
  }')

echo "$SESSION_RESPONSE" | jq '.'
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.session_id')
echo "Session ID: $SESSION_ID"
echo ""

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
  echo "❌ Failed to create session"
  exit 1
fi

# Step 2: Add webhook node
echo "2. Adding webhook node..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"builder_add_node\",
      \"arguments\": {
        \"session_id\": \"$SESSION_ID\",
        \"node\": {
          \"type\": \"webhook\",
          \"config\": {
            \"path\": \"hybrid-test\"
          }
        }
      }
    },
    \"id\": 2
  }" | jq '.result.content[0].text' | jq '.'
echo ""

# Step 3: Add IF node (this will test HYBRID transformation)
echo "3. Adding IF node (testing HYBRID transformation)..."
IF_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"builder_add_node\",
      \"arguments\": {
        \"session_id\": \"$SESSION_ID\",
        \"node\": {
          \"type\": \"if\",
          \"config\": {
            \"conditions\": {
              \"combinator\": \"and\",
              \"conditions\": [
                {
                  \"leftValue\": \"={{ \$json.status }}\",
                  \"rightValue\": \"success\",
                  \"operator\": {
                    \"type\": \"string\",
                    \"operation\": \"equals\"
                  }
                }
              ]
            }
          }
        }
      }
    },
    \"id\": 3
  }")

echo "$IF_RESPONSE" | jq '.result.content[0].text' | jq '.'
IF_NODE_ID=$(echo "$IF_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.node_id')
echo ""

# Step 4: Connect nodes
echo "4. Connecting webhook -> IF..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"builder_connect\",
      \"arguments\": {
        \"session_id\": \"$SESSION_ID\",
        \"from_node\": \"Webhook\",
        \"to_node\": \"IF\"
      }
    },
    \"id\": 4
  }" | jq '.result.content[0].text' | jq '.'
echo ""

# Step 5: Commit workflow
echo "5. Committing workflow..."
COMMIT_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"builder_commit\",
      \"arguments\": {
        \"session_id\": \"$SESSION_ID\",
        \"activate\": false
      }
    },
    \"id\": 5
  }")

echo "$COMMIT_RESPONSE" | jq '.result.content[0].text' | jq '.'
WORKFLOW_ID=$(echo "$COMMIT_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.workflow_id')
echo ""

if [ "$WORKFLOW_ID" = "null" ] || [ -z "$WORKFLOW_ID" ]; then
  echo "❌ Failed to commit workflow"
  exit 1
fi

# Step 6: Retrieve created workflow to verify HYBRID format
echo "6. Retrieving workflow to verify HYBRID format..."
WORKFLOW_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"workflow_get\",
      \"arguments\": {
        \"workflow_id\": \"$WORKFLOW_ID\"
      }
    },
    \"id\": 6
  }")

echo "Full workflow:"
echo "$WORKFLOW_RESPONSE" | jq '.result.content[0].text' | jq '.' > "/tmp/workflow-$WORKFLOW_ID.json"

# Extract IF node to verify HYBRID format
echo ""
echo "=== IF Node Parameters (HYBRID format verification) ==="
cat "/tmp/workflow-$WORKFLOW_ID.json" | jq '.nodes[] | select(.type == "n8n-nodes-base.if")'
echo ""

# Check for HYBRID format requirements
echo "=== Verifying HYBRID format requirements ==="
TYPE_VERSION=$(cat "/tmp/workflow-$WORKFLOW_ID.json" | jq '.nodes[] | select(.type == "n8n-nodes-base.if") | .type_version')
HAS_OPTIONS_WRAPPER=$(cat "/tmp/workflow-$WORKFLOW_ID.json" | jq '.nodes[] | select(.type == "n8n-nodes-base.if") | .parameters.conditions.options != null')
HAS_CONDITION_ID=$(cat "/tmp/workflow-$WORKFLOW_ID.json" | jq '.nodes[] | select(.type == "n8n-nodes-base.if") | .parameters.conditions.conditions[0].id != null')
HAS_ROOT_OPTIONS=$(cat "/tmp/workflow-$WORKFLOW_ID.json" | jq '.nodes[] | select(.type == "n8n-nodes-base.if") | .parameters.options != null')

echo "✓ typeVersion = 2: $([ "$TYPE_VERSION" = "2" ] && echo "✅ PASS" || echo "❌ FAIL (got $TYPE_VERSION)")"
echo "✓ conditions.options wrapper: $([ "$HAS_OPTIONS_WRAPPER" = "true" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "✓ conditions[].id field: $([ "$HAS_CONDITION_ID" = "true" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "✓ parameters.options: $([ "$HAS_ROOT_OPTIONS" = "true" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo ""

echo "Workflow ID: $WORKFLOW_ID"
echo "✅ Test complete. Check N8N UI to verify rendering: https://n8n.strangematic.com/workflow/$WORKFLOW_ID"
