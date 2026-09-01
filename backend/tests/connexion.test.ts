import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { PLAFOND_SENSIBLE } from '@scalar/shared/limites.ts'
import { NOM_COOKIE_PREFERENCES, NOM_COOKIE_SESSION } from '@scalar/shared/session.ts'
import { construireApp } from '../src/app.ts'
import { BaseDonneesService } from '../src/services/base-donnees.service.ts'
import { MotDePasseService } from '../src/services/mot-de-passe.service.ts'
import { modeleSession, modeleUser } from '../src/models/index.ts'
import { configDeTest } from './aide-config.ts'
import { uriDeTest, verifierBaseDeTest } from './aide-base.ts'

const URI_TEST = uriDeTest('connexion')
const CHEMIN_SESSIONS = '/api/v1/sessions'
const CHEMIN_SESSION_COURANTE = '/api/v1/sessions/current'
const CLIENT = '203.0.113.7'

const MOT_DE_PASSE = 'un mot de passe assez long'

function saisieConnexion(surcharges: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'alice@exemple.test',
    motDePasse: MOT_DE_PASSE,
    ...surcharges,
  }
}

function app(surcharges: Parameters<typeof configDeTest>[0] = {}) {
  return construireApp(configDeTest(surcharges))
}

describe('validation de la saisie de connexion', () => {
  it('refuse une saisie non conforme en nommant chaque champ', async () => {
    const reponse = await request(app())
      .post(CHEMIN_SESSIONS)
      .send({ email: 'pas-une-adresse', motDePasse: '' })

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('REQUETE_INVALIDE')

    const chemins = (reponse.body.violations as { chemin: string }[]).map(
      (violation) => violation.chemin,
    )

    expect(chemins).toContain('email')
    expect(chemins).toContain('motDePasse')
  })

  it('nomme le champ manquant plutot que de le traiter comme vide', async () => {
    const reponse = await request(app()).post(CHEMIN_SESSIONS).send({ email: 'alice@exemple.test' })

    expect(reponse.status).toBe(400)

    const chemins = (reponse.body.violations as { chemin: string }[]).map(
      (violation) => violation.chemin,
    )

    expect(chemins).toContain('motDePasse')
  })

  it('ne rejoue jamais le mot de passe dans la reponse', async () => {
    const reponse = await request(app())
      .post(CHEMIN_SESSIONS)
      .send({ email: 'pas-une-adresse', motDePasse: 'secret-saisi' })

    expect(JSON.stringify(reponse.body)).not.toContain('secret-saisi')
  })
})

describe('plafond sensible de la connexion', () => {
  it('refuse au-dela du plafond declare, en nommant la reinitialisation', async () => {
    const instance = app()
    const appeler = () =>
      request(instance).post(CHEMIN_SESSIONS).set('X-Forwarded-For', CLIENT).send({ vide: true })

    for (let compte = 0; compte < PLAFOND_SENSIBLE.maximum; compte += 1) {
      expect((await appeler()).status).toBe(400)
    }

    const refusee = await appeler()

    expect(refusee.status).toBe(429)
    expect(refusee.body.code).toBe('DEBIT_DEPASSE')
    expect(refusee.body.details.maximum).toBe(PLAFOND_SENSIBLE.maximum)
    expect(refusee.body.details.fenetreSecondes).toBe(PLAFOND_SENSIBLE.fenetreMs / 1000)
  })

  it('ne consomme pas le seau par defaut des autres routes', async () => {
    const instance = app()

    for (let compte = 0; compte <= PLAFOND_SENSIBLE.maximum; compte += 1) {
      await request(instance).post(CHEMIN_SESSIONS).set('X-Forwarded-For', CLIENT).send({ vide: true })
    }

    const sante = await request(instance).get('/api/v1/health').set('X-Forwarded-For', CLIENT)

    expect(sante.status).toBe(200)
  })

  it('separe les seaux par identite de client', async () => {
    const instance = app()

    for (let compte = 0; compte <= PLAFOND_SENSIBLE.maximum; compte += 1) {
      await request(instance).post(CHEMIN_SESSIONS).set('X-Forwarded-For', CLIENT).send({ vide: true })
    }

    const autre = await request(instance)
      .post(CHEMIN_SESSIONS)
      .set('X-Forwarded-For', '198.51.100.4')
      .send({ vide: true })

    expect(autre.status).toBe(400)
  })
})

describe('controle d origine sur POST et DELETE /sessions', () => {
  it('refuse une connexion venue d une autre origine', async () => {
    const reponse = await request(app())
      .post(CHEMIN_SESSIONS)
      .set('Origin', 'http://site-malveillant.test')
      .send(saisieConnexion())

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ORIGINE_REFUSEE')
  })

  it('refuse une deconnexion venue d une autre origine', async () => {
    const reponse = await request(app())
      .delete(CHEMIN_SESSIONS)
      .set('Origin', 'http://site-malveillant.test')

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ORIGINE_REFUSEE')
  })
})

describe.skipIf(!URI_TEST)('connexion et deconnexion sur une base reelle', () => {
  const service = new BaseDonneesService()
  const motsDePasse = new MotDePasseService({
    memoireKiB: 19456,
    iterations: 2,
    parallelisme: 1,
  })

  beforeAll(async () => {
    await service.connecter(URI_TEST as string, 5_000)
    await service.creerIndex()
  })

  afterAll(async () => {
    verifierBaseDeTest(mongoose.connection.name ?? '')
    await mongoose.connection.dropDatabase()
    await service.deconnecter()
  })

  beforeEach(async () => {
    await modeleUser().deleteMany({})
    await modeleSession().deleteMany({})
  })

  async function creerUtilisateur(surcharges: Record<string, unknown> = {}) {
    const passwordHash = await motsDePasse.hacher(MOT_DE_PASSE)

    return modeleUser().create({
      displayName: 'Alice Martin',
      email: 'alice@exemple.test',
      passwordHash,
      accountState: 'active',
      ...surcharges,
    })
  }

  it('connecte un utilisateur valide, ouvre une session et pose le cookie', async () => {
    await creerUtilisateur()

    const reponse = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())

    expect(reponse.status).toBe(200)
    expect(reponse.body.accountState).toBe('active')
    expect(reponse.body.displayName).toBe('Alice Martin')
    expect(reponse.body.situations).toEqual([])

    const cookies = reponse.headers['set-cookie'] as unknown as string[]
    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toContain(`${NOM_COOKIE_SESSION}=`)
    expect(cookies[0]).toContain('HttpOnly')
    expect(cookies[0]).toMatch(/SameSite=Lax/i)
    expect(cookies[0]).toContain('Secure')

    expect(await modeleSession().countDocuments({})).toBe(1)
  })

  it('retire `Secure` en developpement, et seulement la', async () => {
    await creerUtilisateur()

    const reponse = await request(app({ NODE_ENV: 'development' }))
      .post(CHEMIN_SESSIONS)
      .send(saisieConnexion())

    const cookies = reponse.headers['set-cookie'] as unknown as string[]
    expect(cookies[0]).not.toContain('Secure')
    expect(cookies[0]).toContain('HttpOnly')
  })

  it('signale les situations d un compte non verifie a la connexion', async () => {
    await creerUtilisateur({ accountState: 'unverified' })

    const reponse = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())

    expect(reponse.status).toBe(200)
    expect(reponse.body.accountState).toBe('unverified')
    expect(reponse.body.situations).toEqual(['compteNonVerifie'])
    expect(reponse.body.adresseAVerifier).toBe('alice@exemple.test')
  })

  it('refuse uniformement en 401 en cas de mot de passe errone', async () => {
    await creerUtilisateur()

    const reponse = await request(app())
      .post(CHEMIN_SESSIONS)
      .send(saisieConnexion({ motDePasse: 'mauvais-mot-de-passe' }))

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('IDENTIFIANTS_INVALIDES')
    expect(reponse.headers['set-cookie']).toBeUndefined()
    expect(await modeleSession().countDocuments({})).toBe(0)
  })

  it('refuse uniformement en 401 en cas d email inconnu', async () => {
    const reponse = await request(app())
      .post(CHEMIN_SESSIONS)
      .send(saisieConnexion({ email: 'inconnu@exemple.test' }))

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('IDENTIFIANTS_INVALIDES')
    expect(reponse.headers['set-cookie']).toBeUndefined()
    expect(await modeleSession().countDocuments({})).toBe(0)
  })

  it('refuse uniformement en 401 pour un compte suspendu sans ouvrir de session', async () => {
    await creerUtilisateur({ accountState: 'suspended' })

    const reponse = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('IDENTIFIANTS_INVALIDES')
    expect(reponse.headers['set-cookie']).toBeUndefined()
    expect(await modeleSession().countDocuments({})).toBe(0)

    const utilisateur = await modeleUser().findOne({ normalizedEmail: 'alice@exemple.test' })
    expect(utilisateur?.accountState).toBe('suspended')
  })

  it('refuse uniformement en 401 pour un compte efface', async () => {
    await creerUtilisateur({ accountState: 'erased' })

    const reponse = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('IDENTIFIANTS_INVALIDES')
    expect(reponse.headers['set-cookie']).toBeUndefined()
    expect(await modeleSession().countDocuments({})).toBe(0)
  })

  it('reconnait l email quelle que soit sa casse ou sa forme Unicode', async () => {
    await creerUtilisateur()

    const majuscule = await request(app())
      .post(CHEMIN_SESSIONS)
      .send(saisieConnexion({ email: 'ALICE@Exemple.TEST ' }))

    expect(majuscule.status).toBe(200)

    const unicode = await request(app())
      .post(CHEMIN_SESSIONS)
      .send(saisieConnexion({ email: 'ａlice@exemple.test' }))

    expect(unicode.status).toBe(200)
  })

  it('ne sert ni hachage ni jeton dans le corps de connexion', async () => {
    await creerUtilisateur()

    const reponse = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())
    const corps = JSON.stringify(reponse.body)

    expect(corps).not.toContain('argon2')
    expect(corps).not.toContain(MOT_DE_PASSE)
    expect(Object.keys(reponse.body).sort()).toEqual([
      'accountState',
      'displayName',
      'id',
      'situations',
    ])
  })

  it('deconnecte une session active, la supprime en base et expire les cookies', async () => {
    await creerUtilisateur()

    const connexion = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())
    const cookieSession = connexion.headers['set-cookie']?.[0] ?? ''
    const jeton = /scalar_session=([^;]+)/.exec(cookieSession)?.[1] ?? ''

    expect(await modeleSession().countDocuments({})).toBe(1)

    const deconnexion = await request(app())
      .delete(CHEMIN_SESSIONS)
      .set('Cookie', `${NOM_COOKIE_SESSION}=${jeton}`)

    expect(deconnexion.status).toBe(204)

    // La session en base doit etre supprimee
    expect(await modeleSession().countDocuments({})).toBe(0)

    // Les cookies doivent etre expires
    const cookiesSuppression = deconnexion.headers['set-cookie'] as unknown as string[]
    expect(cookiesSuppression).toBeDefined()
    expect(cookiesSuppression.some((c) => c.includes(NOM_COOKIE_SESSION) && (c.includes('Max-Age=0') || c.includes('Expires=')))).toBe(true)
    expect(cookiesSuppression.some((c) => c.includes(NOM_COOKIE_PREFERENCES) && (c.includes('Max-Age=0') || c.includes('Expires=')))).toBe(true)
  })

  it('repond 204 et expire les cookies meme lors d une deconnexion sans session', async () => {
    const deconnexion = await request(app()).delete(CHEMIN_SESSIONS)

    expect(deconnexion.status).toBe(204)
    const cookiesSuppression = deconnexion.headers['set-cookie'] as unknown as string[]
    expect(cookiesSuppression).toBeDefined()
  })

  it('renvoie la charge utile de la session courante sur GET /sessions/current', async () => {
    await creerUtilisateur()

    const connexion = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())
    const cookieSession = connexion.headers['set-cookie']?.[0] ?? ''
    const jeton = /scalar_session=([^;]+)/.exec(cookieSession)?.[1] ?? ''

    const reponse = await request(app())
      .get(CHEMIN_SESSION_COURANTE)
      .set('Cookie', `${NOM_COOKIE_SESSION}=${jeton}`)

    expect(reponse.status).toBe(200)
    expect(reponse.body.accountState).toBe('active')
    expect(reponse.body.displayName).toBe('Alice Martin')
    expect(reponse.body.situations).toEqual([])
  })

  it('refuse GET /sessions/current en 401 NON_AUTHENTIFIE sans cookie ou avec jeton inconnu', async () => {
    const sansCookie = await request(app()).get(CHEMIN_SESSION_COURANTE)

    expect(sansCookie.status).toBe(401)
    expect(sansCookie.body.code).toBe('NON_AUTHENTIFIE')

    const jetonInconnu = await request(app())
      .get(CHEMIN_SESSION_COURANTE)
      .set('Cookie', `${NOM_COOKIE_SESSION}=jeton-invalide`)

    expect(jetonInconnu.status).toBe(401)
    expect(jetonInconnu.body.code).toBe('NON_AUTHENTIFIE')
  })

  it('refuse GET /sessions/current en 401 si la session a ete revoquee', async () => {
    const utilisateur = await creerUtilisateur()

    const connexion = await request(app()).post(CHEMIN_SESSIONS).send(saisieConnexion())
    const cookieSession = connexion.headers['set-cookie']?.[0] ?? ''
    const jeton = /scalar_session=([^;]+)/.exec(cookieSession)?.[1] ?? ''

    // Revoquer toutes les sessions
    await modeleUser().updateOne(
      { _id: utilisateur._id },
      { $set: { sessionsInvalidBefore: new Date(Date.now() + 10_000) } },
    )

    const reponse = await request(app())
      .get(CHEMIN_SESSION_COURANTE)
      .set('Cookie', `${NOM_COOKIE_SESSION}=${jeton}`)

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('NON_AUTHENTIFIE')
  })
})
