import { config as chargerFichierEnv } from 'dotenv'
import * as v from 'valibot'
import { estSecretDeRemplissage, LONGUEUR_MINIMALE_SECRET } from '@scalar/shared/proxy.ts'
import { PLAFOND_CONCURRENCE_RUNNER } from '@scalar/shared/limites.ts'

// Seul endroit du runner qui lit process.env — meme patron que
// `backend/src/config/index.ts`. dotenv ne surcharge pas une variable deja
// presente : l'environnement reel du compose prime toujours sur un fichier
// oublie dans l'image.
chargerFichierEnv({ path: process.env.CHEMIN_FICHIER_ENV ?? '.env', quiet: true })

function schemaSecret(nom: string) {
  return v.pipe(
    v.string(),
    v.minLength(LONGUEUR_MINIMALE_SECRET, `doit faire au moins ${LONGUEUR_MINIMALE_SECRET} caracteres`),
    v.check(
      (valeur) => !estSecretDeRemplissage(valeur),
      `${nom} porte encore une valeur de remplissage : generez-en une aleatoire`,
    ),
  )
}

const schema = v.pipe(
  v.object({
  NODE_ENV: v.optional(v.picklist(['development', 'test', 'production']), 'development'),
  PORT: v.pipe(
    v.optional(v.string(), '4000'),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1),
    v.maxValue(65535),
  ),
  // Deux secrets distincts, un par sens d'appel (AD-16) : celui-ci garde le
  // depot API -> runner, jamais de valeur par defaut.
  SECRET_RUNNER_DEPOT: schemaSecret('SECRET_RUNNER_DEPOT'),
  // Celui-ci porte le rappel runner -> API, dans l'autre sens ; les deux ne
  // doivent jamais partager la meme valeur, sans quoi un compromis de l'un
  // compromet l'autre.
  SECRET_RUNNER_RAPPEL: schemaSecret('SECRET_RUNNER_RAPPEL'),
  // Base de l'API interne que le runner rappelle a la fin d'une execution.
  // Jamais lue ailleurs : `rappel.ts` est le seul consommateur.
  URL_RAPPEL_API: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.regex(/^https?:\/\//, 'doit commencer par http:// ou https://'),
  ),
  PLAFOND_CONCURRENCE: v.pipe(
    v.optional(v.string(), String(PLAFOND_CONCURRENCE_RUNNER)),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1),
  ),
  }),
  // Le commentaire sur `SECRET_RUNNER_RAPPEL` ci-dessus l'annonce : jamais la
  // meme valeur que `SECRET_RUNNER_DEPOT`. Rien ne le verifiait avant ce
  // controle croise.
  v.check(
    (config) => config.SECRET_RUNNER_DEPOT !== config.SECRET_RUNNER_RAPPEL,
    'SECRET_RUNNER_DEPOT et SECRET_RUNNER_RAPPEL doivent porter des valeurs distinctes (AD-16)',
  ),
)

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
