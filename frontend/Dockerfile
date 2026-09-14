FROM node:24-alpine

WORKDIR /app

# Le monorepo est copie en entier : le postinstall de Nuxt (nuxt prepare)
# a besoin de nuxt.config.ts, donc l'installation vient apres la copie.
COPY . .
RUN npm ci

EXPOSE 3000
ENV HOST=0.0.0.0

CMD ["npm", "run", "dev", "--workspace", "frontend"]
