# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY server/package.json ./server/
RUN cd server && npm install --omit=dev --prefer-offline

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Shared code used by both server and tests
COPY shared/ ./shared/
# Server source
COPY server/ ./server/
# Pre-built deps from stage 1
COPY --from=deps /app/server/node_modules ./server/node_modules

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "index.js"]
