# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.22.0-alpine

FROM ${NODE_IMAGE} AS dev
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY admin/package.json admin/
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages packages
COPY frontend frontend
# Le postinstall (nuxt prepare) a besoin de frontend/ : copié avant.
RUN --mount=type=cache,target=/root/.npm npm ci --workspace frontend --workspace @scalar/ui --include-workspace-root
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace", "frontend"]

FROM dev AS build
RUN npm run build --workspace frontend

# .output est autonome : ni node_modules ni sources dans l'image finale.
FROM ${NODE_IMAGE} AS prod
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/frontend/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", ".output/server/index.mjs"]
