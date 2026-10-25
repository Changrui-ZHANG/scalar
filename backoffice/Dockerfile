# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.22.0-alpine

FROM ${NODE_IMAGE} AS dev
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY admin/package.json admin/
COPY backoffice/package.json backoffice/
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages packages
COPY backoffice backoffice
# Le postinstall (nuxt prepare) a besoin de backoffice/ : copié avant.
RUN --mount=type=cache,target=/root/.npm npm ci --workspace backoffice --include-workspace-root
ENV HOST=0.0.0.0 PORT=3003
EXPOSE 3003
CMD ["npm", "run", "dev", "--workspace", "backoffice"]

FROM dev AS build
RUN npm run build --workspace backoffice

# .output est autonome : ni node_modules ni sources dans l'image finale.
FROM ${NODE_IMAGE} AS prod
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3003
COPY --from=build /app/backoffice/.output ./.output
USER node
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:3003/backoffice/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
