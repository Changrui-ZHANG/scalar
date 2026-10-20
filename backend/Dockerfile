# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.22.0-alpine

FROM ${NODE_IMAGE} AS base
# Prisma (moteur de migration) a besoin d'OpenSSL, absent d'Alpine.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY admin/package.json admin/
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages packages
COPY backend backend

FROM base AS dev
RUN --mount=type=cache,target=/root/.npm npm ci --workspace backend --include-workspace-root
EXPOSE 3001
CMD ["npm", "run", "dev", "--workspace", "backend"]

FROM base AS prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace backend --include-workspace-root --omit=dev
# Les tests ne partent pas en production.
RUN find backend -name '*.test.ts' -delete
# Fichiers à root, lisibles : l'utilisateur node n'a rien à écrire.
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:3001/api/v1/health || exit 1
CMD ["node", "backend/src/index.ts"]
