import { describe, expect, it } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import { ETATS_COMPTE, etatSuffit, type EtatCompte } from '@scalar/shared/compte.ts'
import { ORDRE_CHAINE } from '@scalar/shared/limites.ts'
import { NOM_COOKIE_SESSION, type Principal } from '@scalar/shared/session.ts'
import { construireApp } from '../src/app.ts'
import { construireEtatCompte } from '../src/middlewares/etat-compte.middleware.ts'
import { construireSession } from '../src/middlewares/session.middleware.ts'
import { verifierOrdreChaine } from '../src/middlewares/chaine.ts'
import { gestionErreur, routeIntrouvable } from '../src/middlewares/erreur.middleware.ts'
import type { SessionService } from '../src/services/session.service.ts'
import { configDeTest } from './aide-config.ts'

// Le maillon n'est monte sur aucune route du produit : il n'y a pas encore de
// route a garder. Il se teste donc sur une application de laboratoire, montee
// dans l'ordre declare — le vrai maillon de session devant, sur un service
// double qui rend le principal voulu sans base.
function appGardee(minimum: EtatCompte, principal?: Principal): { app: Express; vues: string[] } {
  const vues: string[] = []
  const app = express()
  const sessions = { lire: async () => principal } as unknown as SessionService

  app.use(construireSession(sessions))
  app.get('/garde', construireEtatCompte(minimum), (_requete, reponse) => {
    vues.push('atteinte')
    reponse.status(204).end()
  })
  app.use(routeIntrouvable)
  app.use(gestionErreur)

  return { app, vues }
}

function appeler(app: Express) {
  return request(app).get('/garde').set('Cookie', `${NOM_COOKIE_SESSION}=jeton-de-laboratoire`)
}

describe('echelle de suffisance des etats de compte', () => {
  it('declare tous les etats du produit, et rien d autre', () => {
    expect([...ETATS_COMPTE]).toEqual(['unverified', 'active', 'suspended', 'erased'])
  })

  it('classe `active` au-dessus d `unverified`', () => {
    expect(etatSuffit('active', 'unverified')).toBe(true)
    expect(etatSuffit('unverified', 'active')).toBe(false)
  })

  // Le defaut que ce cas attrape : un rang absent, lu comme zero par une
  // comparaison numerique, ferait passer un compte suspendu pour suffisant des
  // que le minimum exige est `unverified` — c'est-a-dire sur toute route
  // simplement « connecte ».
  it('place `suspended` et `erased` hors de l echelle, jamais en bas', () => {
    for (const etat of ['suspended', 'erased'] as const) {
      expect(etatSuffit(etat, 'unverified')).toBe(false)
      expect(etatSuffit(etat, 'active')).toBe(false)
    }
  })
})

describe('maillon d etat de compte', () => {
  it('laisse passer un etat suffisant', async () => {
    const { app, vues } = appGardee('unverified', { id: 'a', accountState: 'unverified' })

    expect((await appeler(app)).status).toBe(204)
    expect(vues).toEqual(['atteinte'])
  })

  it('refuse un compte non verifie sur une route qui exige `active`', async () => {
    const { app, vues } = appGardee('active', { id: 'a', accountState: 'unverified' })

    const reponse = await appeler(app)

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ETAT_COMPTE_INSUFFISANT')
    expect(reponse.body.details).toEqual({ etatCourant: 'unverified', etatExige: 'active' })
    expect(vues).toEqual([])
  })

  it('refuse un compte suspendu, meme sur le minimum le plus bas', async () => {
    const { app } = appGardee('unverified', { id: 'a', accountState: 'suspended' })

    expect((await appeler(app)).status).toBe(403)
  })

  // Refus par defaut : un principal absent n'est pas un etat inconnu qu'on
  // laisse passer. Le refus est servi sans `etatCourant`, parce qu'il n'y en a
  // pas et qu'en inventer un servirait du faux.
  it('refuse un appelant sans session, sans lui inventer d etat', async () => {
    const { app, vues } = appGardee('active')

    const reponse = await appeler(app)

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ETAT_COMPTE_INSUFFISANT')
    expect(reponse.body.details).toEqual({ etatExige: 'active' })
    expect(vues).toEqual([])
  })
})

describe('montage du maillon d etat de compte', () => {
  it('se place entre la session et le role dans l ordre declare', () => {
    expect([...ORDRE_CHAINE]).toEqual(['debit', 'session', 'etatCompte', 'role'])
    expect(() => verifierOrdreChaine(['session', 'etatCompte', 'role'])).not.toThrow()
    expect(() => verifierOrdreChaine(['etatCompte', 'session'])).toThrow(/sous-sequence/)
  })

  // Le monter globalement refuserait l'inscription elle-meme, faite par un
  // visiteur sans compte. Ce cas echoue si quelqu'un l'ajoute a `app.ts`.
  it('n est monte sur aucune route : l inscription reste ouverte a un visiteur', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .post('/api/v1/accounts')
      .send({ displayName: '', email: 'pas-une-adresse', motDePasse: 'court' })

    // Une saisie invalide, donc `REQUETE_INVALIDE` : la demande a traverse la
    // chaine jusqu'a la validation. Un `ETAT_COMPTE_INSUFFISANT` ici voudrait
    // dire que le maillon garde une route qu'aucun compte ne peut atteindre.
    expect(reponse.body.code).toBe('REQUETE_INVALIDE')
  })
})
