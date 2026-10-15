FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build:standalone

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATABASE_PATH=/app/data/umnik.sqlite
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --chown=node:node server ./server
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node deploy/ru/maintenance.mjs ./deploy/ru/maintenance.mjs
RUN mkdir -p data backups && chown node:node data backups
USER node
EXPOSE 3000
CMD ["sh","-c","umask 077; node server/migrate.mjs && exec node server/supervise.mjs"]

