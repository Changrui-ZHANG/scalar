import tailwindcss from '@tailwindcss/vite'

// Meme valeur pour le rendu serveur (`apiInterne`) et pour le pont de
// developpement ci-dessous : la dupliquer laisserait les deux diverger des
// qu'un backend lance hors Docker change de port. Surchargeable par
// NUXT_API_INTERNE ; la valeur par defaut vise un backend lance sur l'hote.
const API_INTERNE_DEV = process.env.NUXT_API_INTERNE ?? 'http://127.0.0.1:3001/api/v1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // Base absolue utilisee par le rendu serveur seul : Nitro appelle le
    // backend directement, sans traverser le proxy. Surchargee par
    // NUXT_API_INTERNE ; la valeur par defaut vise un backend lance sur l'hote.
    apiInterne: API_INTERNE_DEV,
    public: {
      // Un chemin, jamais un hote : le navigateur reste sur l'origine unique,
      // donc le cookie de session part et aucun CORS n'est necessaire.
      apiBase: '/api/v1',
    },
  },
  // Pont du serveur de developpement Nitro, uniquement : quand le frontend
  // tourne seul (`npm run dev --workspace frontend`, sans Traefik devant),
  // un appel navigateur vers le chemin relatif `/api/v1` resoudrait sinon
  // contre l'origine de Nuxt (le port 3000), qui ne sait pas le servir --
  // aucun rapport avec la production ni avec `docker compose up -d`, ou
  // Traefik route `/api/v1` vers `backend` avant meme que la requete
  // n'atteigne ce serveur de dev (voir `compose.yaml`, priorite du routeur
  // backend superieure a celle du frontend).
  nitro: {
    devProxy: {
      // Nitro retire le prefixe de la cle avant de transmettre : la cible
      // doit donc porter `/api/v1` elle-meme pour que le chemin reconstitue
      // corresponde a ce que le backend monte reellement.
      //
      // `changeOrigin` reste absent (donc `false`) : le controle d'origine du
      // backend (`origine.middleware.ts`) compare l'en-tete `Origin` du
      // navigateur au `Host` recu, sans aucune liste configurable -- c'est la
      // moitie de la defense CSRF que AD-25 demande. Reecrire le `Host` vers
      // la cible ferait echouer cette comparaison sur toute requete non-GET
      // (connexion, inscription...), puisque l'`Origin` reel envoye par le
      // navigateur resterait `http://localhost:3000`.
      '/api/v1': {
        target: API_INTERNE_DEV,
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
