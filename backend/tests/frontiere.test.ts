import { describe, expect, it } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import { construireApp } from '../src/app.ts'
import { SAUTS_PROXY_DE_CONFIANCE } from '../src/contracts/proxy.ts'
import { construireIdentiteClient } from '../src/middlewares/identite-client.middleware.ts'
import { assemblerChaine, verifierOrdreChaine } from '../src/middlewares/chaine.ts'
import { construireDebit } from '../src/middlewares/debit.middleware.ts'
import { gestionErreur, routeIntrouvable } from '../src/middlewares/erreur.middleware.ts'
import { PLAFOND_DEFAUT, TAILLE_MAX_CORPS } from '../src/contracts/limites.ts'
import { configDeTest, SECRET_DE_TEST } from './aide-config.ts'

// Une adresse dans la chaine de transfert : sans elle l'identite est `interne`
// et le plafond ne s'applique pas — ce que le dernier test verifie exprès.
const CLIENT_PUBLIC = '203.0.113.7'

// Plafond minuscule : le comportement teste est le franchissement, pas la
// valeur declaree. Monter 301 requetes pour atteindre le plafond par defaut
// n'apprendrait rien de plus et couterait une seconde par execution.
function appPlafonnee(maximum: number): Express {
  const app = express()

  app.set('trust proxy', SAUTS_PROXY_DE_CONFIANCE)
  app.use(construireIdentiteClient(SECRET_DE_TEST))
  app.use(...assemblerChaine([{ nom: 'debit', middleware: construireDebit({ fenetreMs: 60_000, maximum }) }]))
  app.get('/ping', (_requete, reponse) => reponse.json({ ok: true }))
  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return app
}

describe('plafond de debit', () => {
  it('laisse passer une requete sous le plafond', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .get('/api/v1/health')
      .set('X-Forwarded-For', CLIENT_PUBLIC)

    expect(reponse.status).toBe(200)
    expect(reponse.body.statut).toBe('ok')
  })

  it('refuse au-dela du maximum en nommant la reinitialisation', async () => {
    const app = appPlafonnee(2)
    const appeler = () => request(app).get('/ping').set('X-Forwarded-For', CLIENT_PUBLIC)

    expect((await appeler()).status).toBe(200)
    expect((await appeler()).status).toBe(200)

    const refusee = await appeler()

    expect(refusee.status).toBe(429)
    expect(refusee.body.code).toBe('DEBIT_DEPASSE')
    expect(refusee.body.details.maximum).toBe(2)
    expect(refusee.body.details.fenetreSecondes).toBe(60)
    expect(Number.isNaN(Date.parse(refusee.body.details.reinitialisationA))).toBe(false)
  })

  it('separe les seaux par identite plutot que de les fusionner', async () => {
    const app = appPlafonnee(1)

    expect((await request(app).get('/ping').set('X-Forwarded-For', CLIENT_PUBLIC)).status).toBe(200)
    expect((await request(app).get('/ping').set('X-Forwarded-For', CLIENT_PUBLIC)).status).toBe(429)
    expect((await request(app).get('/ping').set('X-Forwarded-For', '198.51.100.4')).status).toBe(200)
  })

  it('n applique aucun plafond anonyme a un appelant interne', async () => {
    const app = appPlafonnee(1)

    // Aucun en-tete de transfert : l'appel n'a traverse aucun proxy de
    // confiance, il est interne. Sans l'exemption, tout le rendu serveur
    // partagerait un seul seau et le second appel serait refuse.
    expect((await request(app).get('/ping')).status).toBe(200)
    expect((await request(app).get('/ping')).status).toBe(200)
    expect((await request(app).get('/ping')).status).toBe(200)
  })
})

describe('ordre de la chaine d autorisation', () => {
  it('accepte une chaine incomplete tant qu elle suit l ordre declare', () => {
    expect(() => verifierOrdreChaine(['debit'])).not.toThrow()
    expect(() => verifierOrdreChaine(['debit', 'role'])).not.toThrow()
    expect(() => verifierOrdreChaine([])).not.toThrow()
  })

  it('leve sur un maillon place avant celui qui doit le preceder', () => {
    expect(() => verifierOrdreChaine(['session', 'debit'])).toThrow(/sous-sequence/)
    expect(() => verifierOrdreChaine(['role', 'etatCompte'])).toThrow(/sous-sequence/)
  })

  it('leve sur un maillon monte deux fois', () => {
    expect(() => verifierOrdreChaine(['debit', 'debit'])).toThrow(/deux fois/)
  })

  it('leve au montage, donc au demarrage, pas a la premiere requete', () => {
    expect(() =>
      assemblerChaine([
        { nom: 'session', middleware: (_requete, _reponse, suivant) => suivant() },
        { nom: 'debit', middleware: construireDebit() },
      ]),
    ).toThrow()
  })
})

// Les tests ci-dessus montent des applications de laboratoire : ils prouvent que
// les middlewares fonctionnent, jamais qu'ils sont montes sur l'application
// servie. Supprimer la chaine de `app.ts` les laissait tous verts.
describe('application reellement servie', () => {
  it('monte le plafond : la reponse porte les en-tetes RateLimit normalises', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .get('/api/v1/health')
      .set('X-Forwarded-For', CLIENT_PUBLIC)

    expect(reponse.status).toBe(200)
    expect(reponse.headers['ratelimit']).toBeDefined()
  })

  it('applique la taille de corps declaree, pas celle par defaut du parseur', async () => {
    const app = construireApp(configDeTest())

    // 110 ko : sous les 128 ko declares, mais **au-dessus** des 100 ko que
    // `express.json()` applique sans option. Ce test echoue si le montage
    // cesse de passer TAILLE_MAX_CORPS.
    const sousLaLimite = await request(app)
      .post('/api/v1/inconnu')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ charge: 'x'.repeat(110 * 1024) }))

    expect(sousLaLimite.status).not.toBe(413)

    const auDessus = await request(app)
      .post('/api/v1/inconnu')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ charge: 'x'.repeat(200 * 1024) }))

    expect(auDessus.status).toBe(413)
    expect(auDessus.body.code).toBe('CORPS_TROP_VOLUMINEUX')
  })

  it('plafonne avant de lire le corps : hors plafond, un corps hors limite ressort en 429', async () => {
    const app = construireApp(configDeTest())
    const client = '198.51.100.99'

    // Epuiser le plafond reel de l'application servie. Par lots, pour ne pas
    // payer 300 aller-retours sequentiels.
    for (let debut = 0; debut < PLAFOND_DEFAUT.maximum; debut += 50) {
      const lot = Math.min(50, PLAFOND_DEFAUT.maximum - debut)

      await Promise.all(
        Array.from({ length: lot }, () =>
          request(app).get('/api/v1/health').set('X-Forwarded-For', client),
        ),
      )
    }

    const horsPlafond = await request(app)
      .post('/api/v1/inconnu')
      .set('X-Forwarded-For', client)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ charge: 'x'.repeat(200 * 1024) }))

    // 413 signifierait que le parseur a lu le corps avant que le plafond ne
    // tranche — l'inversion des deux `app.use` de `app.ts`.
    expect(horsPlafond.status).toBe(429)
    expect(horsPlafond.body.code).toBe('DEBIT_DEPASSE')
    expect(horsPlafond.headers['retry-after']).toBeDefined()
  })

  it('declare une taille de corps que le parseur comprend', () => {
    expect(TAILLE_MAX_CORPS).toMatch(/^\d+kb$/)
  })
})
