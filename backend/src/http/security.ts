import type { Express } from 'express'

import { config } from '../config.ts'

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const

const HSTS = 'max-age=31536000'

export function secure(app: Express, hsts = config.NODE_ENV === 'production'): void {
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set(SECURITY_HEADERS)
    if (hsts) {
      res.setHeader('Strict-Transport-Security', HSTS)
    }
    next()
  })
}
