# ============================================================
# Dockerfile - Multi-stage build for Club Manager v3
# Optimized for AWS ECS/Fargate deployment
# ============================================================

# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first for layer caching optimization
COPY package.json package-lock.json ./

# Install all dependencies deterministically
RUN npm ci

# Copy remaining application source code
COPY . .

# --- Production stage ---
FROM node:22-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user and group for security
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Copy package files and install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application files from the build stage
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/config.js ./config.js
COPY --from=build /app/database.js ./database.js
COPY --from=build /app/views/ ./views/
COPY --from=build /app/public/ ./public/
COPY --from=build /app/routes/ ./routes/
COPY --from=build /app/services/ ./services/
COPY --from=build /app/middleware/ ./middleware/
COPY --from=build /app/utils/ ./utils/
COPY --from=build /app/scripts/ ./scripts/

# Create uploads and reports directories with correct ownership
RUN mkdir -p uploads reports && chown -R appuser:appuser uploads reports

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
