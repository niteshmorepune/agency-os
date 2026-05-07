# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

# Skip Chromium download here — installed system-wide in the runtime stage
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package manifests first so Docker layer-caches the install step
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# .dockerignore excludes package-lock.json — Windows lock files embed
# the wrong native binary URLs (missing linux-x64-musl variants)
RUN npm install

COPY . .

# Generate Prisma client BEFORE tsc — postinstall can't find schema until source is copied
RUN cd server && npx prisma generate

# Build order mirrors the root build script: shared → server → client
RUN npm run build

# ─── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# chromium + deps: Puppeteer PDF generation
# openssl: required by Prisma client on Alpine
# dumb-init: correct PID-1 signal handling (avoids zombie processes)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl \
    dumb-init

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

# node_modules was installed on Alpine in the builder, so native binaries
# (Sharp, Prisma, etc.) already match this runtime image
COPY --from=builder /build/node_modules ./node_modules

# Compiled artifacts
COPY --from=builder /build/server/dist  ./server/dist
COPY --from=builder /build/shared/dist  ./shared/dist
COPY --from=builder /build/client/dist  ./client/dist

# Prisma schema + migrations — needed by `migrate deploy` at container start
COPY --from=builder /build/server/prisma ./server/prisma

# Package manifests required for npm workspace module resolution at runtime
COPY package.json       ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Persistent directories — mapped to named Docker volumes
RUN mkdir -p uploads logs

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
# Wait for postgres, run migrations, then start the server
CMD ["sh", "-c", \
  "node_modules/.bin/prisma migrate deploy --schema=server/prisma/schema.prisma && \
   node server/dist/server.js"]
