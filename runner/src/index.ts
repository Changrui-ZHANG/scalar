import { writeSync } from 'node:fs'
import { construireApp } from './app.ts'
import { chargerConfig } from './config.ts'

const DELAI_ARRET_MS = 10_000

function journaliser(niveau: 'info' | 'error', message: string, extra: object = {}): void {
  writeSync(niveau === 'error' ? 2 : 1, `${JSON.stringify({ niveau, message, ...extra })}\n`)
}

process.on('unhandledRejection', (raison: unknown) => {
  journaliser('error', 'rejet de promesse non capture', {
    detail: raison instanceof Error ? raison.message : String(raison),
  })
  process.exit(1)
})

const config = chargerConfig()

// Aucune base, aucune dependance a verifier avant d'ecouter (AD-3) : le
// runner ne se connecte a rien d'autre que le demon Docker, joint a la
// demande, execution par execution.
const serveur = construireApp(config).listen(config.PORT, () => {
  journaliser('info', 'runner demarre', { port: config.PORT })
})

serveur.on('error', (erreur: unknown) => {
  journaliser('error', 'ecoute impossible', {
    detail: erreur instanceof Error ? erreur.message : String(erreur),
  })
  process.exit(1)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    const secours = setTimeout(() => {
      journaliser('error', 'arret force apres delai', { signal })
      process.exit(1)
    }, DELAI_ARRET_MS)

    secours.unref()
    serveur.closeIdleConnections()

    serveur.close(() => {
      clearTimeout(secours)
      journaliser('info', 'arret propre', { signal })
      process.exit(0)
    })
  })
}
