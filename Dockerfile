# ==============================================================================
# Multi-Stage Production Dockerfile for StudyOS
# Stage 1: Build the Single-Page & Full-Stack React Frontend + AI Backend
# Stage 2: Minimal Production Alpine Node.js Runner with Security Best Practices
# ==============================================================================

# --- STAGE 1: BUILD ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Copy source code and config files
COPY . .

# Build standard Vite assets
RUN npm run build

# --- STAGE 2: PRODUCTION RUNTIME ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV AI_SERVER_PORT=5001

# Create non-root system user for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 studyos

# Copy built frontend assets and server files
COPY --from=builder --chown=studyos:nodejs /app/dist ./dist
COPY --from=builder --chown=studyos:nodejs /app/server ./server
COPY --from=builder --chown=studyos:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=studyos:nodejs /app/package.json ./package.json

USER studyos

EXPOSE 5173
EXPOSE 5001

# Health check against the standalone health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start the standalone server
CMD ["node", "--loader", "tsx", "server/standalone.ts"]
