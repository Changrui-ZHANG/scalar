import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

// L'alias `~` designe `app/`, comme partout ailleurs dans cet espace.
// L'environnement de test ne le recoit pas de la configuration Nuxt : sans ces
// deux lignes, tout fichier de `app/` qui importe un autre fichier de `app/`
// par son alias echoue a se resoudre, et l'echec se lit comme un fichier
// manquant plutot que comme un alias absent.
const SRC = fileURLToPath(new URL('./app', import.meta.url))

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
  },
  resolve: {
    alias: {
      '~': SRC,
      '@': SRC,
    },
  },
})
