# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholders solo para satisfacer la validación Zod de src/lib/env.ts durante el
# build (Next analiza las rutas estáticamente). Los valores REALES se inyectan en
# runtime vía el bloque `environment:` de docker-compose, no se hornean en la imagen.
# EXCEPCIÓN: NEXT_PUBLIC_* se hornea en el bundle del cliente en build-time, así que
# debe recibir su valor REAL aquí vía build arg (no sirve inyectarlo en runtime).
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV DATABASE_URL="postgres://build:build@localhost:5432/build" \
    BETTER_AUTH_SECRET="build_time_placeholder_secret_min_32_chars_xxxxx" \
    BETTER_AUTH_URL="http://localhost:3000" \
    NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL} \
    NODE_ENV=production
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]
