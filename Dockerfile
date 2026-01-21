# @strange/mcp-n8n - MCP N8N Server
FROM node:20-alpine AS builder

# Build arguments for cache busting and version tracking
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

# Labels for traceability
LABEL git.commit="${GIT_COMMIT}" \
      build.date="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/trangpl193/strange-mcp-n8n"

# Install timezone data
RUN apk add --no-cache tzdata

WORKDIR /app

# Copy mcp-core dependency first
COPY strange-mcp-core /tmp/mcp-core
WORKDIR /tmp/mcp-core
RUN npm install && npm run build

# Back to app directory
WORKDIR /app

# Copy package files
COPY strange-mcp-n8n/package.json strange-mcp-n8n/package-lock.json ./
RUN npm install --production=false

# Copy the built mcp-core into node_modules
RUN rm -rf node_modules/@strange && \
    mkdir -p node_modules/@strange && \
    cp -r /tmp/mcp-core node_modules/@strange/mcp-core

# Copy source
COPY strange-mcp-n8n/tsconfig.json strange-mcp-n8n/tsup.config.ts ./
COPY strange-mcp-n8n/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install timezone data
RUN apk add --no-cache tzdata

WORKDIR /app

# Copy built assets and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 -G mcp && \
    chown -R mcp:mcp /app

USER mcp

# Health check - verify MCP server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3302/health').then(r => r.json()).then(d => d.status === 'healthy' ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3302

# Use SDK version with Streamable HTTP transport (Claude Code compatible)
CMD ["node", "dist/cli-sdk.js"]
