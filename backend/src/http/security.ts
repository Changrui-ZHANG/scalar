import type { Express } from 'express'
import helmet from 'helmet'

export function secure(app: Express): void {
  // Derriere Traefik : sans cela, tous les clients partagent l'IP du proxy et donc le meme compteur de debit.
  app.set('trust proxy', 1)
  // CSP, HSTS, frame-ancestors, Referrer-Policy, nosniff ; retire aussi X-Powered-By.
  app.use(helmet())
}
