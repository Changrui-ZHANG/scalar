FROM node:24-alpine

WORKDIR /app

COPY . .
RUN npm ci

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace", "backend"]
