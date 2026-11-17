import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

const SRC = fileURLToPath(new URL('./app', import.meta.url))

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    dir: '../tests/unit/admin',
    // Le demarrage de l'application Nuxt depasse largement les 10 s par defaut a froid.
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '~': SRC,
      '@': SRC,
    },
  },
})
