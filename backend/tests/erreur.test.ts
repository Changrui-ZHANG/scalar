import { describe, expect, it } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import * as v from 'valibot'
import { CODES_ERREUR, MESSAGES_VIOLATION } from '../src/contracts/erreurs.ts'
import { TAILLE_MAX_CORPS } from '../src/contracts/limites.ts'
import { gestionErreur, routeIntrouvable } from '../src/middlewares/erreur.middleware.ts'
import { valider } from '../src/middlewares/validation.middleware.ts'

// Les routes que la matrice exerce — un payload valide, un handler qui leve —
// n'existent pas dans le produit : ce sont les middlewares qui sont testes, pas
// une surface metier. D'ou cette application minimale, montee comme `app.ts`
// monte la vraie : parseur borne, puis routes, puis terminal.
function appDeTest(monter: (app: Express) => void): Express {
  const app = express()

  app.use(express.json({ limit: TAILLE_MAX_CORPS }))
  monter(app)
  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return app
}

const schemaInscription = v.object({
  nom: v.pipe(v.string(), v.minLength(2)),
  age: v.pipe(v.number(), v.integer()),
})

describe('enveloppe d erreur unique', () => {
  it('sert une route absente par le terminal, pas par la route', async () => {
    const reponse = await request(appDeTest(() => {})).get('/api/v1/inconnu')

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('ROUTE_INTROUVABLE')
    expect(reponse.body.message).toBe(CODES_ERREUR.ROUTE_INTROUVABLE.message)
  })

  it('convertit une exception inattendue sans en servir la cause', async () => {
    const app = appDeTest((instance) => {
      instance.get('/casse', () => {
        throw new Error('secret interne : mongodb://utilisateur:motdepasse@hote')
      })
    })

    const reponse = await request(app).get('/casse')

    expect(reponse.status).toBe(500)
    expect(reponse.body.code).toBe('ERREUR_INTERNE')
    expect(reponse.body.message).toBe(CODES_ERREUR.ERREUR_INTERNE.message)
    expect(JSON.stringify(reponse.body)).not.toContain('motdepasse')
    expect(JSON.stringify(reponse.body)).not.toContain('secret interne')
  })

  it('refuse un corps au-dela de la taille declaree', async () => {
    const app = appDeTest((instance) => {
      instance.post('/echo', (_requete, reponse) => reponse.json({ recu: true }))
    })

    const reponse = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ charge: 'x'.repeat(300_000) }))

    expect(reponse.status).toBe(413)
    expect(reponse.body.code).toBe('CORPS_TROP_VOLUMINEUX')
  })

  it('ne corrompt pas une reponse deja commencee', async () => {
    const app = appDeTest((instance) => {
      instance.get('/partiel', (_requete, reponse) => {
        reponse.status(200).type('application/json').write('{"partiel":')
        throw new Error('panne apres le debut de la reponse')
      })
    })

    // Le terminal ne peut plus ecrire de statut : il delegue, Express clot la
    // connexion, et le client recoit une reponse tronquee — jamais un second
    // corps colle derriere le premier.
    const echec = await request(app)
      .get('/partiel')
      .then(() => null)
      .catch((erreur: Error) => erreur)

    expect(echec).toBeInstanceOf(Error)
    expect(String(echec)).not.toContain('ERREUR_INTERNE')

    // L'application reste utilisable apres coup.
    expect((await request(app).get('/api/v1/inconnu')).status).toBe(404)
  })

  it('refuse un JSON malforme sans le confondre avec une panne', async () => {
    const app = appDeTest((instance) => {
      instance.post('/echo', (_requete, reponse) => reponse.json({ recu: true }))
    })

    const reponse = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"nom": ')

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('CORPS_ILLISIBLE')
  })
})

describe('validation au bord', () => {
  it('refuse un payload non conforme en nommant les champs, sans atteindre le service', async () => {
    let serviceAtteint = false

    const valide = valider('corps', schemaInscription)
    const app = appDeTest((instance) => {
      instance.post('/inscriptions', valide.middleware, (_requete, reponse) => {
        serviceAtteint = true
        reponse.status(201).json({ cree: true })
      })
    })

    const reponse = await request(app).post('/inscriptions').send({ nom: 'a', age: 'trente' })

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    expect(serviceAtteint).toBe(false)

    const chemins = (reponse.body.violations as { chemin: string }[]).map((violation) => violation.chemin)

    expect(chemins).toContain('nom')
    expect(chemins).toContain('age')

    // Le message servi vient du catalogue, jamais de valibot : sans cela le
    // client recoit « Invalid type: Expected number but received "trente" » —
    // de l'anglais, la forme du schema, et sa propre saisie rejouee.
    const messages = (reponse.body.violations as { message: string }[]).map((violation) => violation.message)

    for (const message of messages) {
      expect(Object.values(MESSAGES_VIOLATION)).toContain(message)
    }

    expect(JSON.stringify(reponse.body)).not.toContain('trente')
    expect(JSON.stringify(reponse.body)).not.toContain('Invalid')
  })

  it('valide aussi les parametres de requete et de chemin', async () => {
    const surRequete = valider('requete', v.object({ page: v.pipe(v.string(), v.minLength(1)) }))
    const surChemin = valider('chemin', v.object({ id: v.pipe(v.string(), v.minLength(3)) }))

    const app = appDeTest((instance) => {
      instance.get('/liste', surRequete.middleware, (requete, reponse) =>
        reponse.json(surRequete.lire(requete)),
      )
      instance.get('/objets/:id', surChemin.middleware, (requete, reponse) =>
        reponse.json(surChemin.lire(requete)),
      )
    })

    expect((await request(app).get('/liste?page=2')).body).toEqual({ page: '2' })
    expect((await request(app).get('/liste')).status).toBe(400)
    expect((await request(app).get('/objets/abc')).body).toEqual({ id: 'abc' })
    expect((await request(app).get('/objets/ab')).status).toBe(400)
  })

  it('ne laisse au handler que la sortie du schema', async () => {
    const valide = valider('corps', schemaInscription)
    const app = appDeTest((instance) => {
      instance.post('/inscriptions', valide.middleware, (requete, reponse) => {
        reponse.json({ recu: valide.lire(requete) })
      })
    })

    const reponse = await request(app)
      .post('/inscriptions')
      .send({ nom: 'Alice', age: 30, champInconnu: 'ignore' })

    expect(reponse.status).toBe(200)
    expect(reponse.body.recu).toEqual({ nom: 'Alice', age: 30 })
  })

  it('leve si le handler lit hors de la chaine plutot que de rendre un objet vide', () => {
    const valide = valider('corps', schemaInscription)

    expect(() => valide.lire({} as never)).toThrow()
  })
})

describe('voix des messages servis', () => {
  const BANNIES = ['une erreur est survenue', 'erreur 500', 'erreur 504', 'acces refuse']

  // Sans depouiller les accents, « Accès refusé » passerait le garde-fou alors
  // que « acces refuse » est dans la liste.
  const depouiller = (texte: string): string =>
    texte
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  for (const [code, definition] of Object.entries(CODES_ERREUR)) {
    it(`${code} respecte le registre`, () => {
      expect(definition.message).not.toMatch(/[!]|\p{Extended_Pictographic}/u)
      expect(definition.message.toLowerCase()).not.toMatch(/\btu\b|\bton\b|\bta\b|\btes\b/)

      for (const bannie of BANNIES) {
        expect(definition.message.toLowerCase()).not.toContain(bannie)
      }

      expect(definition.message.trim()).toMatch(/\.$/)
    })
  }
})
