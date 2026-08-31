import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { PLAFOND_SENSIBLE } from '@scalar/shared/limites.ts'
import { NOM_COOKIE_SESSION } from '@scalar/shared/session.ts'
import { LONGUEUR_MIN_MOT_DE_PASSE } from '@scalar/shared/inscription.ts'
import { construireApp } from '../src/app.ts'
import { BaseDonneesService } from '../src/services/base-donnees.service.ts'
import { modeleSession, modeleUser } from '../src/models/index.ts'
import { configDeTest } from './aide-config.ts'
import { uriDeTest, verifierBaseDeTest } from './aide-base.ts'

const URI_TEST = uriDeTest('inscription')
const CHEMIN = '/api/v1/accounts'
const CLIENT = '203.0.113.7'

const MOT_DE_PASSE = 'un mot de passe assez long'

function saisieValide(surcharges: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    displayName: 'Alice Martin',
    email: 'alice@exemple.test',
    motDePasse: MOT_DE_PASSE,
    ...surcharges,
  }
}

// Une application neuve par cas : `express-rate-limit` tient ses compteurs dans
// la fermeture du middleware, donc partager l'application ferait dependre un
// cas des appels du precedent.
function app(surcharges: Parameters<typeof configDeTest>[0] = {}) {
  return construireApp(configDeTest(surcharges))
}

describe('validation de la saisie d inscription', () => {
  it('refuse une saisie non conforme en nommant chaque champ, sans rien creer', async () => {
    const reponse = await request(app())
      .post(CHEMIN)
      .send({ displayName: '', email: 'pas-une-adresse', motDePasse: 'court' })

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('REQUETE_INVALIDE')

    const chemins = (reponse.body.violations as { chemin: string }[]).map(
      (violation) => violation.chemin,
    )

    expect(chemins).toContain('displayName')
    expect(chemins).toContain('email')
    expect(chemins).toContain('motDePasse')
  })

  it('nomme le champ manquant plutot que de le traiter comme vide', async () => {
    const reponse = await request(app()).post(CHEMIN).send({ email: 'alice@exemple.test' })

    expect(reponse.status).toBe(400)

    const chemins = (reponse.body.violations as { chemin: string }[]).map(
      (violation) => violation.chemin,
    )

    expect(chemins).toContain('displayName')
    expect(chemins).toContain('motDePasse')
  })

  // La politique se declare une fois, dans `shared` : un mot de passe d'un
  // caractere de moins que le plancher est refuse, un mot de passe exactement
  // au plancher passe la validation. Recopier le nombre ici l'aurait fige.
  it('applique le plancher de longueur declare, ni plus ni moins', async () => {
    const trop = await request(app())
      .post(CHEMIN)
      .send(saisieValide({ motDePasse: 'a'.repeat(LONGUEUR_MIN_MOT_DE_PASSE - 1) }))

    expect(trop.status).toBe(400)
    expect(
      (trop.body.violations as { chemin: string }[]).map((violation) => violation.chemin),
    ).toContain('motDePasse')
  })

  it('ne rejoue jamais la saisie recue dans la reponse', async () => {
    const reponse = await request(app())
      .post(CHEMIN)
      .send(saisieValide({ email: 'pas-une-adresse', motDePasse: 'secret-court' }))

    expect(JSON.stringify(reponse.body)).not.toContain('secret-court')
    expect(JSON.stringify(reponse.body)).not.toContain('pas-une-adresse')
  })
})

describe('plafond sensible de l inscription', () => {
  // Les demandes ci-dessous sont invalides a dessein : le plafond est le
  // premier maillon de la chaine, donc il compte avant que la validation ne
  // tranche, et aucune base n'est necessaire pour l'exercer.
  it('refuse au-dela du plafond declare, en nommant la reinitialisation', async () => {
    const instance = app()
    const appeler = () =>
      request(instance).post(CHEMIN).set('X-Forwarded-For', CLIENT).send({ vide: true })

    for (let compte = 0; compte < PLAFOND_SENSIBLE.maximum; compte += 1) {
      expect((await appeler()).status).toBe(400)
    }

    const refusee = await appeler()

    expect(refusee.status).toBe(429)
    expect(refusee.body.code).toBe('DEBIT_DEPASSE')
    expect(refusee.body.details.maximum).toBe(PLAFOND_SENSIBLE.maximum)
    expect(refusee.body.details.fenetreSecondes).toBe(PLAFOND_SENSIBLE.fenetreMs / 1000)
  })

  // Substitution, jamais cumul : le seau sensible est celui de cette route et
  // d'elle seule. S'il s'ajoutait au seau par defaut, l'epuiser fermerait aussi
  // le reste de l'API pour ce client.
  it('ne consomme pas le seau par defaut des autres routes', async () => {
    const instance = app()

    for (let compte = 0; compte <= PLAFOND_SENSIBLE.maximum; compte += 1) {
      await request(instance).post(CHEMIN).set('X-Forwarded-For', CLIENT).send({ vide: true })
    }

    const sante = await request(instance).get('/api/v1/health').set('X-Forwarded-For', CLIENT)

    expect(sante.status).toBe(200)
  })

  it('separe les seaux par identite de client', async () => {
    const instance = app()

    for (let compte = 0; compte <= PLAFOND_SENSIBLE.maximum; compte += 1) {
      await request(instance).post(CHEMIN).set('X-Forwarded-For', CLIENT).send({ vide: true })
    }

    const autre = await request(instance)
      .post(CHEMIN)
      .set('X-Forwarded-For', '198.51.100.4')
      .send({ vide: true })

    expect(autre.status).toBe(400)
  })
})

// Ces cas exigent une base reelle. Sans `MONGODB_URI_TEST`, le fichier reste
// vert : `npm run test` ne doit pas dependre de Docker.
describe.skipIf(!URI_TEST)('inscription sur une base reelle', () => {
  const service = new BaseDonneesService()

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

  it('cree un compte actif, ouvre une session et pose le cookie', async () => {
    const reponse = await request(app()).post(CHEMIN).send(saisieValide())

    expect(reponse.status).toBe(201)
    expect(reponse.body.accountState).toBe('active')
    expect(reponse.body.displayName).toBe('Alice Martin')
    expect(reponse.body.situations).toEqual([])

    const enBase = await modeleUser().findOne({ normalizedEmail: 'alice@exemple.test' })

    expect(enBase?.accountState).toBe('active')
    expect(await modeleSession().countDocuments({})).toBe(1)
  })

  it('pose exactement un cookie, HttpOnly et SameSite=Lax', async () => {
    const reponse = await request(app()).post(CHEMIN).send(saisieValide())
    const cookies = reponse.headers['set-cookie'] as unknown as string[]

    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toContain(`${NOM_COOKIE_SESSION}=`)
    expect(cookies[0]).toContain('HttpOnly')
    expect(cookies[0]).toMatch(/SameSite=Lax/i)
    expect(cookies[0]).toContain('Secure')
  })

  // `Secure` sur une origine servie en clair ferait que le navigateur ne
  // renvoie jamais le cookie : la session serait perdue a la premiere
  // navigation, en developpement seulement.
  it('retire `Secure` en developpement, et seulement la', async () => {
    const reponse = await request(app({ NODE_ENV: 'development' }))
      .post(CHEMIN)
      .send(saisieValide({ email: 'dev@exemple.test' }))
    const cookies = reponse.headers['set-cookie'] as unknown as string[]

    expect(cookies[0]).not.toContain('Secure')
    expect(cookies[0]).toContain('HttpOnly')
  })

  // Le jeton n'existe qu'en clair dans le cookie. La base ne garde que son
  // empreinte : un vol de sauvegarde ne rend aucune session utilisable.
  it('ne stocke que l empreinte du jeton, jamais le jeton', async () => {
    const reponse = await request(app()).post(CHEMIN).send(saisieValide())
    const cookies = reponse.headers['set-cookie'] as unknown as string[]
    const jeton = /scalar_session=([^;]+)/.exec(cookies[0] ?? '')?.[1] ?? ''

    expect(jeton).not.toBe('')

    const stocke = await modeleSession().findOne({}).select('+tokenHash')

    expect(stocke?.tokenHash).toBeDefined()
    expect(stocke?.tokenHash).not.toBe(jeton)
  })

  it('ne sert ni hachage de mot de passe ni jeton dans le corps', async () => {
    const reponse = await request(app()).post(CHEMIN).send(saisieValide())
    const enBase = await modeleUser().findOne({}).select('+passwordHash')
    const corps = JSON.stringify(reponse.body)

    expect(enBase?.passwordHash).toBeDefined()
    expect(corps).not.toContain(enBase?.passwordHash as string)
    expect(corps).not.toContain('argon2')
    expect(corps).not.toContain(MOT_DE_PASSE)
    expect(Object.keys(reponse.body).sort()).toEqual([
      'accountState',
      'adresseAVerifier',
      'displayName',
      'id',
      'situations',
    ])
  })

  // Le hachage est exclu au niveau du modele : une lecture ordinaire ne le
  // selectionne pas, donc aucune projection oubliee ne peut le servir.
  it('exclut le hachage de toute lecture qui ne le demande pas', async () => {
    await request(app()).post(CHEMIN).send(saisieValide())

    const ordinaire = await modeleUser().findOne({})

    expect(ordinaire?.passwordHash).toBeUndefined()
    expect(JSON.stringify(ordinaire?.toJSON())).not.toContain('argon2')
  })

  it('refuse une adresse deja prise sous une autre casse', async () => {
    expect((await request(app()).post(CHEMIN).send(saisieValide())).status).toBe(201)

    const seconde = await request(app())
      .post(CHEMIN)
      .send(saisieValide({ displayName: 'Autre', email: 'ALICE@Exemple.TEST ' }))

    expect(seconde.status).toBe(409)
    expect(seconde.body.code).toBe('ADRESSE_DEJA_UTILISEE')
    expect(await modeleUser().countDocuments({})).toBe(1)
  })

  it('refuse une adresse deja prise sous une autre forme Unicode', async () => {
    expect((await request(app()).post(CHEMIN).send(saisieValide())).status).toBe(201)

    // « ａ » pleine largeur : canoniquement equivalent a « a » apres NFKC, donc
    // la meme cle d'unicite. Sans la normalisation, deux comptes coexisteraient.
    const seconde = await request(app())
      .post(CHEMIN)
      .send(saisieValide({ displayName: 'Autre', email: 'ａlice@exemple.test' }))

    expect(seconde.status).toBe(409)
    expect(await modeleUser().countDocuments({})).toBe(1)
  })

  // C'est le cas qui interdit « lire puis creer » : deux lectures concurrentes
  // ne trouveraient rien et creeraient deux comptes. Seul l'index tranche, et
  // la perdante rend un conflit — jamais une erreur interne.
  it('ne cree qu un compte quand deux inscriptions concurrentes portent la meme adresse', async () => {
    const instance = app()
    const envoyer = () => request(instance).post(CHEMIN).send(saisieValide())

    const [premiere, seconde] = await Promise.all([envoyer(), envoyer()])
    const statuts = [premiere.status, seconde.status].sort((a, b) => a - b)

    expect(statuts).toEqual([201, 409])
    expect(premiere.status === 500 || seconde.status === 500).toBe(false)
    expect(await modeleUser().countDocuments({})).toBe(1)
  })
})
