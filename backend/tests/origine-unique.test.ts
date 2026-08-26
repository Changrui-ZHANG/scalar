import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { construireApp } from '../src/app.ts'
import { SAUTS_PROXY_DE_CONFIANCE } from '../src/contracts/proxy.ts'
import {
  construireIdentiteClient,
  lireIdentiteClient,
} from '../src/middlewares/identite-client.middleware.ts'
import { configDeTest } from './aide-config.ts'

const config = configDeTest()

describe('en-tetes de reponse de l API', () => {
  it('interdit la mise en cache par un intermediaire', async () => {
    const reponse = await request(construireApp(config)).get('/api/v1/health')

    expect(reponse.headers['cache-control']).toContain('no-store')
  })

  it('interdit aussi la mise en cache d une reponse d erreur', async () => {
    const reponse = await request(construireApp(config)).get('/api/v1/inconnu')

    expect(reponse.status).toBe(404)
    expect(reponse.headers['cache-control']).toContain('no-store')
  })

  it("n expose aucun en-tete CORS : l origine est unique, il n y a rien a autoriser", async () => {
    const reponse = await request(construireApp(config)).get('/api/v1/health')

    for (const nom of Object.keys(reponse.headers)) {
      expect(nom.startsWith('access-control-')).toBe(false)
    }
  })

  it("ne repond pas non plus a une requete preliminaire par un en-tete d autorisation", async () => {
    const reponse = await request(construireApp(config))
      .options('/api/v1/health')
      .set('Origin', 'https://ailleurs.example')
      .set('Access-Control-Request-Method', 'GET')

    expect(reponse.headers['access-control-allow-origin']).toBeUndefined()
    expect(reponse.headers['access-control-allow-credentials']).toBeUndefined()
  })

  it("n annonce pas la pile qui sert la reponse", async () => {
    const reponse = await request(construireApp(config)).get('/api/v1/health')

    expect(reponse.headers['x-powered-by']).toBeUndefined()
  })
})

describe('dependances', () => {
  it("ne declare aucune bibliotheque CORS : son besoin signalerait une origine perdue", () => {
    const manifeste: unknown = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    )
    const { dependencies = {}, devDependencies = {} } = manifeste as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    expect(Object.keys({ ...dependencies, ...devDependencies })).not.toContain('cors')
  })
})

// Monte sur une application nue plutot que sur `construireApp` : le
// gestionnaire de route inconnue est terminal, donc une sonde ajoutee apres lui
// ne serait jamais atteinte. Ce qui est verifie ici est le middleware en
// situation Express — quel en-tete il lit, ce qu'il rend lisible ensuite.
function appAvecSonde(): { app: Express; vues: unknown[] } {
  const vues: unknown[] = []
  const app = express()

  app.set('trust proxy', SAUTS_PROXY_DE_CONFIANCE)
  app.use(construireIdentiteClient(config.SECRET_PSEUDONYMISATION))
  app.get('/sonde', (requete, reponse) => {
    vues.push(lireIdentiteClient(requete))
    reponse.status(204).end()
  })

  return { app, vues }
}

describe('identite de client posee sur la requete', () => {
  it('est publique et pseudonymisee derriere le proxy', async () => {
    const { app, vues } = appAvecSonde()

    await request(app).get('/sonde').set('X-Forwarded-For', '203.0.113.7')

    expect(vues).toEqual([
      { nature: 'publique', pseudonyme: expect.stringMatching(/^[0-9a-f]{32}$/) },
    ])
  })

  it("ne retient pas l en-tete injecte par le client", async () => {
    const { app: reel, vues: vuesReelles } = appAvecSonde()
    const { app: usurpe, vues: vuesUsurpees } = appAvecSonde()

    await request(reel).get('/sonde').set('X-Forwarded-For', '203.0.113.7')
    await request(usurpe).get('/sonde').set('X-Forwarded-For', '1.2.3.4, 203.0.113.7')

    expect(vuesUsurpees).toEqual(vuesReelles)
  })

  it('est interne quand aucun proxy de confiance n a ete traverse', async () => {
    const { app, vues } = appAvecSonde()

    await request(app).get('/sonde')

    expect(vues).toEqual([{ nature: 'interne' }])
  })
})

describe('lecture hors de la chaine', () => {
  it("echoue bruyamment plutot que de rendre une identite par defaut", () => {
    const requete = {} as unknown as Parameters<typeof lireIdentiteClient>[0]

    expect(() => lireIdentiteClient(requete)).toThrow()
  })
})
