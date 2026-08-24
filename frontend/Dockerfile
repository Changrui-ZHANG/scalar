FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci --workspace frontend --include-workspace-root

COPY frontend ./frontend

EXPOSE 3000
ENV HOST=0.0.0.0

CMD ["npm", "run", "dev", "--workspace", "frontend"]
