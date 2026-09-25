FROM node:24.16.0-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global npm@11.16.0
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --workspace apps/api
COPY apps/api ./apps/api
# URL apenas sintática: generate e build não acessam o banco.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/driverfin_build npm run build --workspace apps/api

FROM base AS production-dependencies
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --workspace apps/api --omit=dev

FROM production-dependencies AS runtime
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e 'fetch(`http://127.0.0.1:${process.env.PORT}/api/health`, { signal: AbortSignal.timeout(3000) }).then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));'
CMD ["node", "apps/api/dist/main.js"]
