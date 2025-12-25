# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Copy existing database (populated with data)
RUN mkdir -p /app/data
COPY src/app/data/prod.db /app/data/prod.db

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy necessary files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema (needed by client)
COPY --from=builder /app/prisma ./prisma

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy pre-initialized database as template (will be overwritten by volume if exists)
COPY --from=builder --chown=nextjs:nodejs /app/data/prod.db /app/data/prod.db.template

USER nextjs

EXPOSE 3888

ENV PORT=3888
ENV HOSTNAME="0.0.0.0"

# Copy template db if no existing db, then start server
CMD ["sh", "-c", "[ -f /app/data/prod.db ] || cp /app/data/prod.db.template /app/data/prod.db; node server.js"]
