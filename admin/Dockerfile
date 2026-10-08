FROM node:24-alpine

WORKDIR /app

# Le monorepo est copie en entier : le postinstall de Nuxt (nuxt prepare)
# a besoin de nuxt.config.ts, donc l'installation vient apres la copie.
# Seules les dependances de l'admin : ni Prisma ni ses moteurs a telecharger.
COPY . .
RUN npm ci --workspace admin

EXPOSE 3002
ENV HOST=0.0.0.0

CMD ["npm", "run", "dev", "--workspace", "admin"]
