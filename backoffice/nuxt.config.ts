// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  // Outil interne : ni rendu serveur ni référencement. Les routes /api du
  // serveur Nitro, elles, tournent toujours.
  ssr: false,
  app: {
    // Traefik sert cette application sous /backoffice, sur la même origine que le site.
    baseURL: '/backoffice/',
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/backoffice/logo.svg' }],
    },
  },
  runtimeConfig: {
    // Base du backend, lue en lecture seule. Surchargée par NUXT_DATABASE_URL.
    databaseUrl: 'postgres://scalar:scalar@127.0.0.1:5433/scalar',
  },
  vite: {
    server: {
      watch: { usePolling: true },
    },
  },
})
