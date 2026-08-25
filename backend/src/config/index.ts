import * as v from 'valibot'

// Seul endroit du backend qui lit process.env. La configuration est validee
// une fois, au demarrage : une variable absente ou invalide arrete le process.
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
