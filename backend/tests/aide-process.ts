import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { SECRET_DE_TEST } from './aide-config.ts'

// Lancement du vrai point d'entree, partage par les tests qui verifient un
// refus de demarrer. Ils sont plusieurs a en avoir besoin — index manquant,
// base injoignable, plancher argon2id franchi — et trois copies de ce
// mecanisme divergeraient sur le premier detail qui compte, l'un des delais.

const RACINE = fileURLToPath(new URL('..', import.meta.url))

// Chemin qui n'existe pas : dotenv ne trouve rien et ne peuple rien.
const SANS_FICHIER_ENV = '.env.absent-volontairement'

// Le chargement du graphe d'imports coute plusieurs secondes a froid : tout
// test qui lance le vrai point d'entree doit porter son propre delai, sinon
// les 5 s par defaut de vitest le font echouer sur un cache froid.
export const DELAI_PROCESS_MS = 45_000

// Variables retirees de l'environnement herite : ce sont celles dont un test
// veut controler la valeur, et que le shell de l'executant fausserait.
const ECARTEES = new Set([
  'MONGODB_URI',
  'MONGODB_URI_TEST',
  'SECRET_PSEUDONYMISATION',
  'ARGON2_MEMOIRE_KIB',
  'ARGON2_ITERATIONS',
  'ARGON2_PARALLELISME',
])

export interface Resultat {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
}

// Un port fixe ferait passer les tests de refus pour la mauvaise raison
// (EADDRINUSE au lieu de l'index manquant).
export async function portLibre(): Promise<string> {
  const serveur = createServer()

  await new Promise<void>((resoudre) => serveur.listen(0, '127.0.0.1', resoudre))

  const adresse = serveur.address()
  const port = typeof adresse === 'object' && adresse !== null ? adresse.port : 0

  await new Promise<void>((resoudre) => serveur.close(() => resoudre()))

  return String(port)
}

export function environnementPropre(supplement: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = {}

  for (const [cle, valeur] of Object.entries(process.env)) {
    if (!ECARTEES.has(cle) && valeur !== undefined) {
      base[cle] = valeur
    }
  }

  return { ...base, ...supplement }
}

export function lancer(supplement: Record<string, string>): ChildProcessWithoutNullStreams {
  return spawn(process.execPath, ['src/index.ts'], {
    cwd: RACINE,
    // Le secret est fourni par defaut : la plupart de ces tests portent sur
    // autre chose que lui, et le laisser absent les ferait echouer ailleurs.
    // Le chemin de fichier pointe volontairement dans le vide : un `.env`
    // present chez l'executant repeuplerait les variables retirees expres.
    env: environnementPropre({
      CHEMIN_FICHIER_ENV: SANS_FICHIER_ENV,
      SECRET_PSEUDONYMISATION: SECRET_DE_TEST,
      ...supplement,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

export async function lancerJusquAlaSortie(
  supplement: Record<string, string>,
): Promise<Resultat> {
  const enfant = lancer(supplement)

  let stdout = ''
  let stderr = ''

  enfant.stdout.on('data', (morceau: Buffer) => (stdout += morceau.toString()))
  enfant.stderr.on('data', (morceau: Buffer) => (stderr += morceau.toString()))

  // Course avec `error` : sans elle, un spawn impossible ne produit jamais
  // `exit` et le test pend jusqu'au delai de la suite, sans diagnostic.
  const [code] = (await Promise.race([
    once(enfant, 'exit'),
    once(enfant, 'error').then(([erreur]) => {
      throw erreur
    }),
  ])) as [number | null, string | null]

  return { code, stdout, stderr }
}

export async function attendreDemarrage(
  enfant: ChildProcessWithoutNullStreams,
): Promise<() => string> {
  let stdout = ''

  // Le tube stderr doit etre draine, sinon l'enfant bloque quand il se remplit.
  enfant.stderr.resume()

  await new Promise<void>((resoudre, rejeter) => {
    const minuteur = setTimeout(
      () => rejeter(new Error(`pas demarre : ${stdout}`)),
      DELAI_PROCESS_MS - 5_000,
    )

    enfant.stdout.on('data', (morceau: Buffer) => {
      stdout += morceau.toString()

      if (stdout.includes('api demarree')) {
        clearTimeout(minuteur)
        resoudre()
      }
    })

    enfant.once('exit', () => {
      clearTimeout(minuteur)
      rejeter(new Error(`sorti avant d ecouter : ${stdout}`))
    })
  })

  return () => stdout
}
