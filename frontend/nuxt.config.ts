import tailwindcss from '@tailwindcss/vite'

// Même valeur pour le rendu serveur (`apiInternalBase`) et pour le pont de
// développement : surchargeable par NUXT_API_INTERNAL_BASE ; la valeur par
// défaut vise un backend lancé sur l'hôte.
const API_INTERNAL_BASE_DEV = process.env.NUXT_API_INTERNAL_BASE ?? 'http://127.0.0.1:3001/api/v1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  extends: ['../packages/ui'],
  modules: ['@nuxt/eslint', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      // Le logo SVG suit le thème du système ; il passe devant le favicon.ico par défaut.
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    },
  },
  runtimeConfig: {
    // Base absolue utilisée par le rendu serveur seul : Nitro appelle le
    // backend directement, sans traverser le proxy.
    apiInternalBase: API_INTERNAL_BASE_DEV,
    public: {
      // Un chemin, jamais un hôte : le navigateur reste sur l'origine unique.
      apiBase: '/api/v1',
    },
  },
  // Pont du serveur de développement Nitro, uniquement : quand le frontend
  // tourne seul (`npm run dev --workspace frontend`, sans Traefik devant).
  nitro: {
    devProxy: {
      // Le pont garde Host (pas de changeOrigin), car l'API d'administration
      // compare Origin à Host (specs-backend.md § 7.3).
      '/api/v1': {
        target: API_INTERNAL_BASE_DEV,
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
})
