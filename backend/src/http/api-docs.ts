import { readFileSync } from 'node:fs'

import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import { parse } from 'yaml'

const SPEC_URL = new URL('../../openapi.yaml', import.meta.url)

export interface OpenApiSpec {
  readonly openapi: string
  readonly servers: readonly { readonly url: string }[]
  readonly paths: Readonly<Record<string, Readonly<Record<string, unknown>>>>
}

export function loadOpenApiSpec(): OpenApiSpec {
  return parse(readFileSync(SPEC_URL, 'utf8')) as OpenApiSpec
}

export function serveApiDocs(app: Express): void {
  const spec = loadOpenApiSpec()
  app.get('/api/v1/docs/openapi.json', (_req, res) => {
    res.json(spec)
  })
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(spec))
}
