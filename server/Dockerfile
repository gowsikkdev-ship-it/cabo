# ── Stage 1: build client ─────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app
COPY shared/ ./shared/
COPY client/package.json ./client/
RUN cd client && npm install
COPY client/ ./client/
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN cd client && npm run build

# ── Stage 2: server deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev --prefer-offline

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY shared/ ./shared/
COPY server/ ./server/
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "index.js"]
