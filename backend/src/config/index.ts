import { config as chargerFichierEnv } from 'dotenv'
import * as v from 'valibot'
import { estSecretDeRemplissage, LONGUEUR_MINIMALE_SECRET } from '@scalar/shared/proxy.ts'

// Seul endroit du backend qui lit process.env — y compris pour savoir d'ou le
// peupler. Le chargement du fichier vit donc ici et nulle part ailleurs :
// place dans un point d'entree, chaque nouveau point d'entree devrait y penser,
// et celui qui l'oublierait echouerait a un endroit qui n'a pas la reponse.
//
// dotenv ne surcharge pas une variable deja presente : en compose comme en
// production, l'environnement reel prime sur un fichier oublie dans l'image.
// `quiet` supprime la banniere d'astuce, qui polluerait un journal JSON.
//
// Le chemin est surchargeable pour que les tests qui demarrent le process
// puissent le priver de fichier : sans cela, un `.env` present sur la machine
// de l'executant repeuplerait les variables qu'ils retirent expres.
chargerFichierEnv({ path: process.env.CHEMIN_FICHIER_ENV ?? '.env', quiet: true })

// La configuration est validee une fois, au demarrage : une variable absente
// ou invalide arrete le process en la nommant.
const schema = v.object({
  PORT: v.pipe(
    v.optional(v.string(), '3001'),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1),
    v.maxValue(65535),
  ),
  // Requise, non vide, et d'un schema reconnu : sans le controle de schema,
  // une faute de frappe (`mongo://`) passe la validation et ressort dix
  // secondes plus tard en message opaque du pilote.
  MONGODB_URI: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.regex(/^mongodb(\+srv)?:\/\//, 'doit commencer par mongodb:// ou mongodb+srv://'),
  ),
  // Secret de pseudonymisation de l'identite de client. Sans valeur
  // par defaut : un secret partage entre deux deploiements rendrait les
  // pseudonymes comparables d'un environnement a l'autre.
  SECRET_PSEUDONYMISATION: v.pipe(
    v.string(),
    v.minLength(
      LONGUEUR_MINIMALE_SECRET,
      `doit faire au moins ${LONGUEUR_MINIMALE_SECRET} caracteres`,
    ),
    v.check(
      (valeur) => !estSecretDeRemplissage(valeur),
      'porte encore une valeur de remplissage : generez-en une aleatoire',
    ),
  ),
})

export type Config = v.InferOutput<typeof schema>

export function chargerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const resultat = v.safeParse(schema, env)

  if (!resultat.success) {
    for (const probleme of resultat.issues) {
      const nom = probleme.path?.map((segment) => String(segment.key)).join('.') ?? '(racine)'
      console.error(`Configuration invalide : ${nom} — ${probleme.message}`)
    }
    process.exit(1)
  }

  return resultat.output
}
