# @strange/mcp-n8n - MCP N8N Server
FROM node:20-alpine AS builder

# Build arguments
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown

LABEL git.commit="${GIT_COMMIT}" \
      build.date="${BUILD_DATE}"

# Install build dependencies
RUN apk add --no-cache git openssh-client tzdata

WORKDIR /app

# Copy package files
COPY strange-mcp-n8n/package.json ./
COPY strange-mcp-n8n/.npmrc ./

# Install dependencies from GitHub Packages
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=${GITHUB_TOKEN}
RUN npm install --production=false

# Copy source
COPY strange-mcp-n8n/tsconfig.json strange-mcp-n8n/tsup.config.ts ./
COPY strange-mcp-n8n/src ./src

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache tzdata

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 -G mcp && \
    chown -R mcp:mcp /app

USER mcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3302/health').then(r => r.json()).then(d => d.status === 'healthy' ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3302

CMD ["node", "dist/cli-sdk.js"]
