import { writeSync } from 'node:fs'
import { construireApp } from './app.ts'
import { chargerConfig } from './config/index.ts'
import { BaseDonneesService, masquerUri } from './services/base-donnees.service.ts'

// Delai au-dela duquel un arret propre devient un arret force : `close()`
// attend les connexions persistantes, et une seule suffirait a bloquer la
// sortie jusqu'au SIGKILL de l'orchestrateur.
const DELAI_ARRET_MS = 10_000

// Ecriture synchrone : vers un tube (Docker, CI), `console.log` est
// asynchrone et `process.exit()` juste apres peut sortir avant le vidage du
// tampon — l'exploitant recupere alors un code de sortie sans sa raison.
function journaliser(niveau: 'info' | 'error', message: string, extra: object = {}): void {
  writeSync(niveau === 'error' ? 2 : 1, `${JSON.stringify({ niveau, message, ...extra })}\n`)
}

function detailDe(erreur: unknown): string {
  return erreur instanceof Error ? masquerUri(erreur.message) : 'cause inconnue'
}

// Node termine deja en code non nul sur un rejet non capture, mais en
// imprimant une trace brute et non masquee. Ce gestionnaire garantit un
// journal structure et masque avant la sortie (AD-16).
process.on('unhandledRejection', (raison: unknown) => {
  journaliser('error', 'rejet de promesse non capture', { detail: detailDe(raison) })
  process.exit(1)
})

const config = chargerConfig()
const baseDonnees = new BaseDonneesService()

// Connecter, puis verifier, avant d'ouvrir le port. Servir sur une base dont
// les index unique manquent ferait exister l'unicite sur le papier seulement.
try {
  await baseDonnees.connecter(config.MONGODB_URI)
} catch (erreur) {
  journaliser('error', 'connexion a la base impossible', { detail: detailDe(erreur) })
  process.exit(1)
}

// La verification aussi peut echouer autrement qu'en trouvant un ecart :
// authentification refusee, connexion perdue, noeud non primaire. Sans cette
// garde, l'erreur remonte en rejet non gere — trace brute, sans masquage.
let ecarts: readonly string[]

try {
  ecarts = await baseDonnees.verifierIndex()
} catch (erreur) {
  journaliser('error', 'verification des index impossible', { detail: detailDe(erreur) })
  await baseDonnees.deconnecter().catch(() => undefined)
  process.exit(1)
}

if (ecarts.length > 0) {
  for (const ecart of ecarts) {
    journaliser('error', 'index requis non conforme', { ecart })
  }

  await baseDonnees.deconnecter().catch(() => undefined)
  process.exit(1)
}

journaliser('info', 'base connectee, index requis verifies')

const serveur = construireApp(config).listen(config.PORT, () => {
  journaliser('info', 'api demarree', { port: config.PORT })
})

// Un port deja pris emet `error` : sans ecouteur, Node leve et la connexion a
// la base reste ouverte derriere le process mourant.
serveur.on('error', (erreur: unknown) => {
  journaliser('error', 'ecoute impossible', { detail: detailDe(erreur) })
  void baseDonnees.deconnecter().catch(() => undefined).finally(() => process.exit(1))
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
      let code = 0

      void baseDonnees
        .deconnecter()
        .then(() => journaliser('info', 'arret propre', { signal }))
        .catch((erreur: unknown) => {
          code = 1
          journaliser('error', 'arret impropre', { detail: detailDe(erreur) })
        })
        .finally(() => {
          clearTimeout(secours)
          process.exit(code)
        })
    })
  })
}
