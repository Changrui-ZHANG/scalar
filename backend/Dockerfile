FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace backend --include-workspace-root

COPY backend ./backend

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace", "backend"]
