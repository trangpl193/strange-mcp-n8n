#!/bin/bash
# Build mcp-n8n Docker image with npm packages
set -e

echo "📦 Building mcp-n8n Docker image..."

# Load .env if exists and GITHUB_TOKEN not already set
if [ -z "$GITHUB_TOKEN" ] && [ -f .env ]; then
  echo "  Loading GITHUB_TOKEN from .env..."
  export $(grep "^GITHUB_TOKEN=" .env | xargs)
fi

# Check GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ ERROR: GITHUB_TOKEN not set"
  echo "   Option 1: Add to .env file: GITHUB_TOKEN=ghp_..."
  echo "   Option 2: Export: export GITHUB_TOKEN=ghp_..."
  exit 1
fi

# Export build metadata
export GIT_COMMIT=$(git rev-parse HEAD)
export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export DOCKER_BUILDKIT=1

echo "  Git commit: $GIT_COMMIT"
echo "  Build date: $BUILD_DATE"
echo "  Token: ${GITHUB_TOKEN:0:10}..."

# Build with Docker Compose
docker compose build --no-cache

echo "✅ Docker build complete!"
echo ""
echo "To start: docker compose up -d"
echo "To check: curl http://localhost:3302/health"
