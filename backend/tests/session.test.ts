import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import mongoose from 'mongoose'
import { DUREE_SESSION_MS } from '@scalar/shared/limites.ts'
import { NOM_COOKIE_SESSION, OCTETS_JETON_SESSION } from '@scalar/shared/session.ts'
import type { Principal } from '@scalar/shared/session.ts'
import {
  construireSession,
  lireCookie,
  lirePrincipal,
} from '../src/middlewares/session.middleware.ts'
import { SessionService } from '../src/services/session.service.ts'
import { BaseDonneesService } from '../src/services/base-donnees.service.ts'
import { modeleSession, modeleUser } from '../src/models/index.ts'
import { uriDeTest, verifierBaseDeTest } from './aide-base.ts'

const URI_TEST = uriDeTest('session')
const HACHAGE_FACTICE = '$argon2id$v=19$m=19456,t=2,p=1$factice$factice'

describe('lecture du cookie de session', () => {
  it('retrouve le cookie nomme parmi plusieurs', () => {
    expect(lireCookie('autre=1; scalar_session=abc; encore=2', NOM_COOKIE_SESSION)).toBe('abc')
  })

  it('tolere les espaces et l absence du cookie cherche', () => {
    expect(lireCookie('  scalar_session = abc  ', NOM_COOKIE_SESSION)).toBe('abc')
    expect(lireCookie('autre=1', NOM_COOKIE_SESSION)).toBeUndefined()
    expect(lireCookie(undefined, NOM_COOKIE_SESSION)).toBeUndefined()
  })

  // Le jeton est en base64url : son alphabet contient `-` et `_`, jamais `=`
  // en position autre que finale de bourrage — que `toString('base64url')` ne
  // produit pas. Un decoupage sur le **premier** `=` suffit donc.
  it('ne coupe pas un jeton qui contiendrait un signe egal', () => {
    expect(lireCookie('scalar_session=ab=cd', NOM_COOKIE_SESSION)).toBe('ab=cd')
  })
})

// Application de laboratoire : le maillon devant une sonde qui rapporte le
// principal qu'il a attache, ou son absence.
function appAvecSonde(service: SessionService): { app: Express; vues: (Principal | undefined)[] } {
  const vues: (Principal | undefined)[] = []
  const app = express()

  app.use(construireSession(service))
  app.get('/sonde', (requete, reponse) => {
    vues.push(lirePrincipal(requete))
    reponse.status(204).end()
  })

  return { app, vues }
}

describe.skipIf(!URI_TEST)('session sur une base reelle', () => {
  const base = new BaseDonneesService()
  const service = new SessionService()

  beforeAll(async () => {
    await base.connecter(URI_TEST as string, 5_000)
    await base.creerIndex()
  })

  afterAll(async () => {
    verifierBaseDeTest(mongoose.connection.name ?? '')
    await mongoose.connection.dropDatabase()
    await base.deconnecter()
  })

  beforeEach(async () => {
    await modeleUser().deleteMany({})
    await modeleSession().deleteMany({})
  })

  async function creerUtilisateur(surcharges: Record<string, unknown> = {}) {
    return modeleUser().create({
      displayName: 'Alice',
      email: `alice-${Math.random().toString(36).slice(2)}@exemple.test`,
      passwordHash: HACHAGE_FACTICE,
      ...surcharges,
    })
  }

  function avecJeton(app: Express, jeton: string) {
    return request(app).get('/sonde').set('Cookie', `${NOM_COOKIE_SESSION}=${jeton}`)
  }

  it('produit un identifiant d alea, ni ObjectId ni compteur ni horodatage', async () => {
    const utilisateur = await creerUtilisateur()
    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    expect(ouverte).toBeDefined()

    // base64url de 32 octets : 43 caracteres, sans bourrage.
    expect(Buffer.from(ouverte?.jeton ?? '', 'base64url')).toHaveLength(OCTETS_JETON_SESSION)
    expect(ouverte?.jeton).not.toContain(String(utilisateur._id))

    // Deux ouvertures ne se ressemblent pas : un compteur ou un horodatage
    // rendrait la seconde devinable depuis la premiere.
    const autre = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    expect(autre?.jeton).not.toBe(ouverte?.jeton)
  })

  it('borne la session par une expiration absolue declaree', async () => {
    const utilisateur = await creerUtilisateur()
    const avant = Date.now()
    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    expect(ouverte?.expireA.getTime()).toBeGreaterThanOrEqual(avant + DUREE_SESSION_MS)
  })

  // Un compte suspendu ne peut pas ouvrir de session : ses donnees restent
  // intactes, mais aucune session nouvelle ne s'ouvre pour lui.
  it('n ouvre aucune session pour un compte suspendu ou efface', async () => {
    for (const accountState of ['suspended', 'erased'] as const) {
      const utilisateur = await creerUtilisateur({ accountState })

      expect(await service.ouvrir({ id: utilisateur._id, accountState })).toBeUndefined()
      expect(await modeleSession().countDocuments({ user: utilisateur._id })).toBe(0)
    }
  })

  it('resout et attache un principal quand la session est valide', async () => {
    const utilisateur = await creerUtilisateur()
    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })
    const { app, vues } = appAvecSonde(service)

    await avecJeton(app, ouverte?.jeton ?? '')

    expect(vues).toEqual([{ id: String(utilisateur._id), accountState: 'unverified' }])
  })

  // Le document existe encore — le balayage TTL a une granularite de l'ordre de
  // la minute. C'est le chemin de lecture qui tranche, jamais le balayage.
  it('traite comme absente une session expiree dont le document existe encore', async () => {
    const utilisateur = await creerUtilisateur()
    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    await modeleSession().updateOne({}, { $set: { expiresAt: new Date(Date.now() - 1_000) } })

    expect(await modeleSession().countDocuments({})).toBe(1)

    const { app, vues } = appAvecSonde(service)

    await avecJeton(app, ouverte?.jeton ?? '')

    expect(vues).toEqual([undefined])
  })

  // La revocation est une ecriture atomique unique sur `User`, jamais une
  // suppression de documents : appliquee a moitie, une suppression laisserait
  // des sessions vivantes.
  it('refuse une session anterieure au marqueur de revocation, sans supprimer le document', async () => {
    const utilisateur = await creerUtilisateur()
    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    await modeleUser().updateOne(
      { _id: utilisateur._id },
      { $set: { sessionsInvalidBefore: new Date(Date.now() + 1_000) } },
    )

    const { app, vues } = appAvecSonde(service)

    await avecJeton(app, ouverte?.jeton ?? '')

    expect(vues).toEqual([undefined])
    expect(await modeleSession().countDocuments({})).toBe(1)
  })

  it('laisse valide une session ouverte apres le marqueur', async () => {
    const utilisateur = await creerUtilisateur()

    await modeleUser().updateOne(
      { _id: utilisateur._id },
      { $set: { sessionsInvalidBefore: new Date(Date.now() - 10_000) } },
    )

    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })
    const { app, vues } = appAvecSonde(service)

    await avecJeton(app, ouverte?.jeton ?? '')

    expect(vues).toEqual([{ id: String(utilisateur._id), accountState: 'unverified' }])
  })

  it('traite comme absente une session dont le compte a disparu', async () => {
    const utilisateur = await creerUtilisateur()
    const ouverte = await service.ouvrir({
      id: utilisateur._id,
      accountState: utilisateur.accountState,
    })

    await modeleUser().deleteOne({ _id: utilisateur._id })

    const { app, vues } = appAvecSonde(service)

    await avecJeton(app, ouverte?.jeton ?? '')

    expect(vues).toEqual([undefined])
  })

  it('n attache rien sur un jeton inconnu ou un cookie absent', async () => {
    const { app, vues } = appAvecSonde(service)

    await avecJeton(app, 'jeton-qui-n-existe-pas')
    await request(app).get('/sonde')

    expect(vues).toEqual([undefined, undefined])
  })

  // Le maillon resout, il ne refuse pas : c'est ce qui permet de le monter
  // globalement sans fermer l'inscription, faite par un visiteur anonyme.
  it('laisse passer une requete sans session plutot que de la refuser', async () => {
    const { app } = appAvecSonde(service)

    expect((await request(app).get('/sonde')).status).toBe(204)
  })
})
