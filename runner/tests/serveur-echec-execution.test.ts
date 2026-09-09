import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Config } from '../src/config.ts'

const EN_TETE_SECRET = 'x-scalar-runner-secret'

// Simule un `invoquerConteneur` qui echoue avant tout resultat (demon
// injoignable, `createContainer` en erreur...) : ce fichier teste le
// controle de flux de `serveur.ts` face a cet echec, pas le comportement
// reel de Docker (deja couvert, contre un demon reel, par
// `execution.test.ts` et `serveur.test.ts`).
vi.mock('../src/execution/invoquerConteneur.ts', () => ({
  invoquerConteneur: vi.fn().mockRejectedValue(new Error('demon Docker injoignable (simulation)')),
}))

const { construireApp } = await import('../src/app.ts')

function configDeTest(urlRappelApi: string, surcharges: Partial<Config> = {}): Config {
  return {
    NODE_ENV: 'test',
    PORT: 4000,
    SECRET_RUNNER_DEPOT: 'd'.repeat(32),
    SECRET_RUNNER_RAPPEL: 'r'.repeat(32),
    URL_RAPPEL_API: urlRappelApi,
    PLAFOND_CONCURRENCE: 4,
    ...surcharges,
  }
}

interface RappelCapture {
  readonly url: string
  readonly serveur: Server
  readonly appels: unknown[]
  fermer: () => Promise<void>
}

async function demarrerCaptureRappel(): Promise<RappelCapture> {
  const appels: unknown[] = []

  const serveur = createServer((requete, reponse) => {
    let donnees = ''
    requete.on('data', (morceau: Buffer) => (donnees += morceau.toString('utf8')))
    requete.on('end', () => {
      appels.push(donnees.length > 0 ? JSON.parse(donnees) : undefined)
      reponse.writeHead(204)
      reponse.end()
    })
  })

  await new Promise<void>((resoudre) => serveur.listen(0, '127.0.0.1', resoudre))
  const adresse = serveur.address()
  const port = typeof adresse === 'object' && adresse !== null ? adresse.port : 0

  return {
    url: `http://127.0.0.1:${port}`,
    serveur,
    appels,
    fermer: () => new Promise((resoudre) => serveur.close(() => resoudre())),
  }
}

// Une execution qui echoue avant tout resultat (AD-3 : le runner ne detient
// aucun etat) ne doit jamais disparaitre en silence : le rappel part quand
// meme, avec un resultat synthetique, sans quoi la Soumission resterait
// bloquee sur `running` pour toujours, sans aucune trace cote API.
describe('le rappel part meme quand invoquerConteneur echoue avant tout resultat', () => {
  let capture: RappelCapture

  beforeAll(async () => {
    capture = await demarrerCaptureRappel()
  })

  afterAll(async () => {
    await capture.fermer()
  })

  it('rappelle l API avec un resultat synthetique (exitCode null) plutot que de se taire', async () => {
    const config = configDeTest(capture.url)

    const reponse = await request(construireApp(config))
      .post('/executions/soumission-en-echec')
      .set(EN_TETE_SECRET, config.SECRET_RUNNER_DEPOT)
      .send({ languageId: 'javascript', code: '', tests: [] })

    expect(reponse.status).toBe(202)
    expect(reponse.body).toEqual({ admis: true })

    // Le rappel est asynchrone, derriere la reponse deja partie.
    await new Promise((resoudre) => setTimeout(resoudre, 500))

    expect(capture.appels).toHaveLength(1)
    const rappel = capture.appels[0] as Record<string, unknown>
    expect(rappel['exitCode']).toBeNull()
    expect(rappel['signal']).toBeNull()
    expect(typeof rappel['output']).toBe('string')
    expect(rappel['output']).toContain('demon Docker injoignable (simulation)')
    expect(rappel['outputTruncated']).toBe(false)
    expect(typeof rappel['finishedAt']).toBe('string')
  })
})
