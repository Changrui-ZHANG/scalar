import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  CONTENT_SOURCE: z.enum(['database', 'mock']).default('database'),
  DATABASE_URL: z.string().optional(),
  SEED_ON_EMPTY: z.stringbool().default(true),
  PISTON_URL: z.url().default('http://piston:2000/api/v2'),
  PISTON_NODE_VERSION: z.string().default('20.11.1'),
  EXECUTION_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),
  JWT_SECRET: z.string().min(32),
  // false seulement pour un front servi en http hors localhost : le navigateur y ignorerait un cookie Secure.
  AUTH_COOKIE_SECURE: z.stringbool().default(true),
})

export type Config = z.infer<typeof schema>

export function parseConfig(env: Record<string, string | undefined>): Config {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    throw new Error(`Configuration invalide :\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

export const config: Config = parseConfig(process.env)
