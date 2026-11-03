import type { Express } from 'express'

export function secure(app: Express): void {
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })
}
