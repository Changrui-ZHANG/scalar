import { describe, expect, it } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import { CODES_ERREUR } from '@scalar/shared/erreurs.ts'
import { construireApp } from '../src/app.ts'
import { construireOrigine } from '../src/middlewares/origine.middleware.ts'
import { gestionErreur, routeIntrouvable } from '../src/middlewares/erreur.middleware.ts'
import { configDeTest } from './aide-config.ts'

// Application de laboratoire : le middleware est monte seul, devant une route
// qui se contente de dire qu'elle a ete atteinte. Ce qui est verifie est le
// refus, pas ce que la route en ferait.
function appAvecOrigine(): { app: Express; atteintes: string[] } {
  const atteintes: string[] = []
  const app = express()

  app.use(construireOrigine())

  for (const methode of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    app[methode]('/sonde', (requete, reponse) => {
      atteintes.push(requete.method)
      reponse.status(204).end()
    })
  }

  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return { app, atteintes }
}

describe('controle d origine sur les methodes non sures', () => {
  it('refuse une origine etrangere avant d atteindre la route', async () => {
    const { app, atteintes } = appAvecOrigine()

    const reponse = await request(app).post('/sonde').set('Origin', 'https://ailleurs.example')

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ORIGINE_REFUSEE')
    expect(reponse.body.message).toBe(CODES_ERREUR.ORIGINE_REFUSEE.message)
    expect(atteintes).toEqual([])
  })

  it('refuse aussi les autres methodes qui changent quelque chose', async () => {
    const { app, atteintes } = appAvecOrigine()
    const etrangere = 'https://ailleurs.example'

    for (const envoi of [
      request(app).put('/sonde').set('Origin', etrangere),
      request(app).patch('/sonde').set('Origin', etrangere),
      request(app).delete('/sonde').set('Origin', etrangere),
    ]) {
      expect((await envoi).status).toBe(403)
    }

    expect(atteintes).toEqual([])
  })

  it('accepte l origine que la requete a elle-meme atteinte', async () => {
    const { app, atteintes } = appAvecOrigine()
    const serveur = app.listen(0)

    try {
      const adresse = serveur.address()
      const port = typeof adresse === 'object' && adresse !== null ? adresse.port : 0

      const reponse = await request(serveur)
        .post('/sonde')
        .set('Origin', `http://127.0.0.1:${port}`)
        .set('Host', `127.0.0.1:${port}`)

      expect(reponse.status).toBe(204)
      expect(atteintes).toEqual(['POST'])
    } finally {
      serveur.close()
    }
  })

  // Un document sans origine — bac a sable, redirection inter-sites — annonce
  // la chaine `null`, qui ne vaut jamais l'origine servie.
  it('refuse une origine annoncee « null »', async () => {
    const { app } = appAvecOrigine()

    expect((await request(app).post('/sonde').set('Origin', 'null')).status).toBe(403)
  })

  // Un site tiers ne peut pas omettre cette en-tete ; un appel direct, si.
  // Refuser sur l'absence fermerait le rendu serveur sans rien fermer d'autre.
  it('laisse passer un appel sans en-tete d origine', async () => {
    const { app, atteintes } = appAvecOrigine()

    expect((await request(app).post('/sonde')).status).toBe(204)
    expect(atteintes).toEqual(['POST'])
  })

  it('laisse passer une methode sure, meme d une origine etrangere', async () => {
    const { app, atteintes } = appAvecOrigine()

    const reponse = await request(app).get('/sonde').set('Origin', 'https://ailleurs.example')

    expect(reponse.status).toBe(204)
    expect(atteintes).toEqual(['GET'])
  })
})

// Les cas ci-dessus montent une application de laboratoire : ils prouvent que
// le middleware fonctionne, jamais qu'il est monte sur l'application servie.
describe('application reellement servie', () => {
  it('refuse une inscription venue d une autre origine', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .post('/api/v1/accounts')
      .set('Origin', 'https://ailleurs.example')
      .send({ displayName: 'Alice', email: 'alice@ex.com', motDePasse: 'a'.repeat(12) })

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ORIGINE_REFUSEE')
  })

  // Le refus tombe avant la validation : une saisie invalide venue d'ailleurs
  // ressort en refus d'origine, pas en liste de violations.
  it('refuse avant tout traitement du corps', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .post('/api/v1/accounts')
      .set('Origin', 'https://ailleurs.example')
      .send({ displayName: '', email: 'pas-une-adresse', motDePasse: 'court' })

    expect(reponse.body.code).toBe('ORIGINE_REFUSEE')
    expect(reponse.body.violations).toBeUndefined()
  })
})
