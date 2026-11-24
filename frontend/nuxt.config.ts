import tailwindcss from '@tailwindcss/vite'

// Même valeur pour le rendu serveur (`apiInternalBase`) et pour le pont de
// développement : surchargeable par NUXT_API_INTERNAL_BASE ; la valeur par
// défaut vise un backend lancé sur l'hôte.
const API_INTERNAL_BASE_DEV = process.env.NUXT_API_INTERNAL_BASE ?? 'http://127.0.0.1:3001/api/v1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  experimental: {
    asyncContext: true,
  },
  extends: ['../packages/ui'],
  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    'nuxt-security',
  ],

  // Référencement (specs-site.md § 13). L'URL vient de NUXT_SITE_URL ; hors production
  // (NUXT_SITE_ENV différent de « production »), tout le site est en « noindex ».
  site: {
    url: '',
    name: 'Scalar',
    description: 'Une connaissance suffisante. Un rappel suffisant.',
    defaultLocale: 'fr',
  },
  robots: {
    disallow: ['/admin', '/api'],
  },
  routeRules: {
    // Bac à sable : rien à indexer.
    '/exercices': { robots: false },
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },

  // En-têtes de sécurité (specs-site.md § 14, architecture.md § 4.5).
  security: {
    // Un jeton aléatoire par page : seuls les scripts du site et ceux qui portent ce
    // jeton s'exécutent (le script du thème le reçoit par useHead).
    nonce: true,
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{{nonce}}'", "'strict-dynamic'"],
        // Styles en ligne : CodeMirror et les couleurs des jetons Shiki.
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'"],
        // ws: pour le rechargement à chaud en développement.
        'connect-src': ["'self'", 'ws:'],
        'object-src': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': false,
      },
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: false,
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    },
    // Les limites de débit sont posées par le backend et par Traefik.
    rateLimiter: false,
    // Il refuserait les corps qui contiennent du code (POST /api/highlight).
    xssValidator: false,
  },

  // En production (HTTPS) : pas de « ws: », HTTPS forcé.
  $production: {
    security: {
      headers: {
        contentSecurityPolicy: {
          'connect-src': ["'self'"],
          'upgrade-insecure-requests': true,
        },
        strictTransportSecurity: { maxAge: 31536000, includeSubdomains: true },
      },
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      // Icônes du site (charte.md § 1.3) : symbole mobile en SVG, repli PNG 32 px,
      // et icône d'écran d'accueil (180 px, symbole blanc sur tuile bleue).
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
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
