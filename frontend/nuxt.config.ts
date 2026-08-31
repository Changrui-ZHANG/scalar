import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  components: [
    // shadcn-vue livre, pour chaque composant, un `index.ts` (la fabrique de
    // variantes) a cote du `.vue`. Sans cette restriction Nuxt voit deux
    // fichiers resolvant le meme nom et avertit a chaque demarrage.
    { path: '~/components/ui', extensions: ['vue'], pathPrefix: false },
    '~/components',
  ],
  runtimeConfig: {
    // Base absolue utilisee par le rendu serveur seul : Nitro appelle le
    // backend directement, sans traverser le proxy. Surchargee par
    // NUXT_API_INTERNE ; la valeur par defaut vise un backend lance sur l'hote.
    apiInterne: 'http://127.0.0.1:3001/api/v1',
    public: {
      // Un chemin, jamais un hote : le navigateur reste sur l'origine unique,
      // donc le cookie de session part et aucun CORS n'est necessaire.
      apiBase: '/api/v1',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
