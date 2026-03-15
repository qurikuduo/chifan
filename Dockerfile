# =====================
# Stage 1: Build
# =====================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config & lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json for each workspace package
COPY packages/shared/package.json packages/shared/
COPY packages/worker/package.json packages/worker/
COPY packages/web/package.json packages/web/

# Install all dependencies (including devDeps for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/worker/ packages/worker/
COPY packages/web/ packages/web/

# Build shared package first, then frontend
RUN pnpm build:shared && pnpm build:web

# =====================
# Stage 2: Runtime
# =====================
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/worker/package.json packages/worker/

# Install production dependencies only (+ better-sqlite3 native build)
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile --prod && \
    apk del python3 make g++

# Copy built shared package
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/

# Copy worker source (runs via tsx)
COPY packages/worker/src/ packages/worker/src/

# Copy built frontend
COPY --from=builder /app/packages/web/dist/ packages/web/dist/

# Copy init scripts
COPY packages/worker/scripts/ packages/worker/scripts/

# Data directory for SQLite DB and photos
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Environment
ENV PORT=8787
ENV DB_PATH=/app/data/family-menu.db
ENV PHOTOS_PATH=/app/data/photos
ENV STATIC_DIR=../web/dist
ENV NODE_ENV=production

EXPOSE 8787

# Start the server
CMD ["node", "--import", "tsx", "packages/worker/src/server.ts"]
