// Même principe que `frontend/nuxt.config.ts` : un backend lancé sur l'hôte
// par défaut, surchargeable par NUXT_API_INTERNAL_BASE sous Docker.
const API_INTERNAL_BASE_DEV = process.env.NUXT_API_INTERNAL_BASE ?? 'http://127.0.0.1:3001/api/v1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt', '@pinia/colada-nuxt'],
  css: ['~/assets/css/main.css'],
  // Outil interne : ni rendu serveur ni référencement.
  ssr: false,
  app: {
    // Traefik sert cette application sous /admin, sur la même origine que le site.
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
  // Pont de développement quand l'admin tourne seul, sans Traefik devant :
  // le pont garde Host (pas de changeOrigin).
  nitro: {
    devProxy: {
      '/api/v1': { target: API_INTERNAL_BASE_DEV },
    },
  },
  vite: {
    server: {
      watch: { usePolling: true },
    },
  },
})
