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
  MONGODB_URI: v.optional(v.string()),
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
