# Build stage - using alpine for smaller size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage - using alpine-slim for smaller size
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user with fixed UID/GID for Kubernetes compatibility
RUN addgroup -S nodejs || true && \
    adduser -S appuser -u 1001 -G nodejs || true

# Copy only production files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist/ ./dist/

# Use read-only filesystem where possible
RUN chmod -R u+w /app

# Change ownership to non-root user
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose only the application port
EXPOSE 3000

# Health check - verify Node.js process is running and responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "dist/index.js"]
