# Multi-stage build for Melitech CRM
# Stage 1: Build stage
FROM node:22-alpine AS builder

# Accept build arguments for VITE configuration
ARG VITE_APP_ID=melitech_crm
ARG VITE_APP_TITLE="Melitech Solutions CRM"
ARG VITE_APP_LOGO=""
ARG VITE_ANALYTICS_ENDPOINT=""
ARG VITE_ANALYTICS_WEBSITE_ID=""

# Set environment variables for build
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

WORKDIR /app

# Copy patches directory FIRST before any other files
COPY patches ./patches

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm --no-save && \
    npm config set registry https://registry.npmjs.org/ && \
    pnpm config set registry https://registry.npmjs.org/ && \
    pnpm config set fetch-timeout 120000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set auto-install-peers true && \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build the application (do NOT run migrations during build)
RUN pnpm build

# Stage 2: Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm in runtime image
RUN npm install -g pnpm --no-save && \
    npm config set registry https://registry.npmjs.org/ && \
    pnpm config set registry https://registry.npmjs.org/

# Install netcat for database readiness checks
RUN apk add --no-cache netcat-openbsd

# Copy patches directory
COPY patches ./patches

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including dev for drizzle-kit migrations)
RUN pnpm config set fetch-timeout 120000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set auto-install-peers true && \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/server ./server
COPY init-db.ts drizzle-migrate.ts ./

# Ensure drizzle metadata and migrations are present in runtime
COPY drizzle/meta ./drizzle/meta
COPY drizzle/0*.sql ./drizzle/
COPY drizzle/migrations/ ./drizzle/migrations/

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh

echo "[Startup] 🚀 Starting Melitech CRM..."
echo "[Startup] 📝 Environment: NODE_ENV=$NODE_ENV"

# Step 1: Wait for database to be ready
# netcat will both resolve DNS and check if port is open
echo "[Startup] ⏳ Waiting for database at 'db:3306' to be ready..."
MAX_ATTEMPTS=90
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if nc -z -w 2 db 3306 2>/dev/null; then
    echo "[Startup] ✅ Database is ready!"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  if [ $((ATTEMPT % 10)) -eq 0 ]; then
    echo "[Startup] ⏳ Still waiting... ($ATTEMPT/$MAX_ATTEMPTS)"
  fi
  sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "[Startup] ❌ Database failed to respond after ${MAX_ATTEMPTS} seconds"
  echo "[Startup] Make sure:"
  echo "[Startup]   1. Database container is running"
  echo "[Startup]   2. Both containers are on the same Docker network"
  echo "[Startup]   3. Database service name is 'db'"
  exit 1
fi

# Step 2: Give MySQL extra time to fully initialize and accept connections
echo "[Startup] ⏳ Giving MySQL time to fully initialize (5 sec)..."
sleep 5

# Step 3: Run database initialization
echo "[Startup] 🗄️  Running database initialization..."
if npx tsx init-db.ts; then
  echo "[Startup] ✅ Database initialization complete"
else
  EXIT_CODE=$?
  echo "[Startup] ⚠️  Database initialization exited with code $EXIT_CODE"
  if [ $EXIT_CODE -ne 0 ]; then
    echo "[Startup] ℹ️  This may be OK if the database already exists"
  fi
fi

# Step 4: Start the application
echo "[Startup] 🎯 Starting Node.js application..."
exec node dist/index.js
EOF

RUN chmod +x /app/start.sh

# Create non-root user and ensure drizzle directory is writable
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 && \
  mkdir -p /app/drizzle/meta && \
  chown -R nodejs:nodejs /app/drizzle
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["/app/start.sh"]
