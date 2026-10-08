// Meme principe que `frontend/nuxt.config.ts` : un backend lance sur l'hote
// par defaut, surchargeable par NUXT_API_INTERNE sous Docker.
const API_INTERNE_DEV = process.env.NUXT_API_INTERNE ?? 'http://127.0.0.1:3001/api/v1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@pinia/colada-nuxt'],
  css: ['~/assets/css/main.css'],
  // Outil interne derriere une connexion : ni rendu serveur ni referencement.
  ssr: false,
  app: {
    // Traefik sert cette application sous /admin, sur la meme origine que le
    // site : le cookie de session est partage et aucun CORS n'est necessaire.
    baseURL: '/admin/',
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/admin/logo.svg' }],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/api/v1',
    },
  },
  // Pont de developpement quand l'admin tourne seul, sans Traefik devant :
  // voir le commentaire detaille dans `frontend/nuxt.config.ts`.
  nitro: {
    devProxy: {
      '/api/v1': { target: API_INTERNE_DEV },
    },
  },
  vite: {
    server: {
      watch: { usePolling: true },
    },
  },
})
