FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
WORKDIR /app
ARG BA_DRAFT_MODE=false
ENV BA_DRAFT_MODE=${BA_DRAFT_MODE}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN CI=true pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/cp/v1/ba-control/context || exit 1
CMD ["node", "server.js"]
