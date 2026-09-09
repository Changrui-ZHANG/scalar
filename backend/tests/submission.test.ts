import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import * as v from 'valibot'
import { PLAFOND_SENSIBLE, LONGUEUR_MAX_CLE_DEDUPLICATION } from '@scalar/shared/limites.ts'
import { PLAFONDS_QUOTA, periodEnd, periodStart } from '@scalar/shared/quota.ts'
import { createSubmissionSchema } from '@scalar/shared/submission.ts'
import { LONGUEUR_MAX_SLUG_EXERCICE } from '@scalar/shared/exercise.ts'
import { NOM_COOKIE_SESSION } from '@scalar/shared/session.ts'
import type { EtatCompte } from '@scalar/shared/compte.ts'
import { construireApp } from '../src/app.ts'
import { BaseDonneesService } from '../src/services/base-donnees.service.ts'
import {
  modeleExercise,
  modeleQuotaCounter,
  modeleSubmission,
  modeleUser,
} from '../src/models/index.ts'
import { SessionService } from '../src/services/session.service.ts'
import { configDeTest } from './aide-config.ts'
import { uriDeTest, verifierBaseDeTest } from './aide-base.ts'

const URI_TEST = uriDeTest('submission')
const CHEMIN = '/api/v1/submissions'
const CLIENT = '203.0.113.9'

function app() {
  return construireApp(configDeTest())
}

function saisieValide(surcharges: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    exerciseSlug: 'addition-de-deux-nombres',
    code: 'function addition(a, b) { return a + b }',
    requestKey: `cle-${Math.random().toString(36).slice(2)}`,
    ...surcharges,
  }
}

// Ces cas ne demandent ni Express ni base : `createSubmissionSchema` se
// parse directement, comme les bornes AD-8 d`exercise.test.ts se valident
// sans connexion. Ils tournent donc meme sans `MONGODB_URI_TEST`, y compris
// en CI (voir le Spec Change Log de spec-2-4 pour le gap deja connu sur le
// reste de ce fichier).
describe('bornes du schema createSubmissionSchema (sans base)', () => {
  it('refuse un code vide ou compose uniquement d espaces', () => {
    expect(v.safeParse(createSubmissionSchema, saisieValide({ code: '' })).success).toBe(false)
    expect(v.safeParse(createSubmissionSchema, saisieValide({ code: '   \n\t  ' })).success).toBe(
      false,
    )
  })

  it('accepte un code dont seuls les bords portent des espaces', () => {
    const resultat = v.safeParse(createSubmissionSchema, saisieValide({ code: '  x()  ' }))

    expect(resultat.success).toBe(true)
    // Jamais trim : c'est le code source soumis (meme choix que `starterCode`
    // sur `Exercise`).
    if (resultat.success) {
      expect(resultat.output.code).toBe('  x()  ')
    }
  })

  it('refuse un exerciseSlug vide ou plus long que la borne declaree', () => {
    expect(v.safeParse(createSubmissionSchema, saisieValide({ exerciseSlug: '' })).success).toBe(
      false,
    )
    expect(
      v.safeParse(
        createSubmissionSchema,
        saisieValide({ exerciseSlug: 'x'.repeat(LONGUEUR_MAX_SLUG_EXERCICE + 1) }),
      ).success,
    ).toBe(false)
  })

  it('accepte un exerciseSlug exactement a la borne declaree', () => {
    expect(
      v.safeParse(
        createSubmissionSchema,
        saisieValide({ exerciseSlug: 'x'.repeat(LONGUEUR_MAX_SLUG_EXERCICE) }),
      ).success,
    ).toBe(true)
  })

  it('refuse une requestKey vide ou plus longue que la borne declaree', () => {
    expect(v.safeParse(createSubmissionSchema, saisieValide({ requestKey: '' })).success).toBe(
      false,
    )
    expect(
      v.safeParse(
        createSubmissionSchema,
        saisieValide({ requestKey: 'x'.repeat(LONGUEUR_MAX_CLE_DEDUPLICATION + 1) }),
      ).success,
    ).toBe(false)
  })

  it('accepte une requestKey exactement a la borne declaree', () => {
    expect(
      v.safeParse(
        createSubmissionSchema,
        saisieValide({ requestKey: 'x'.repeat(LONGUEUR_MAX_CLE_DEDUPLICATION) }),
      ).success,
    ).toBe(true)
  })
})

describe('bornes de la fenetre de quota (sans base)', () => {
  it('rend le meme bucket pour deux instants de la meme fenetre', () => {
    const windowMs = 60_000
    const debut = new Date('2026-01-01T00:00:00.000Z')
    const finDeFenetre = new Date(debut.getTime() + windowMs - 1)

    expect(periodStart(finDeFenetre, windowMs)).toBe(periodStart(debut, windowMs))
  })

  it('rend un bucket distinct pour la fenetre suivante', () => {
    const windowMs = 60_000
    const debut = new Date('2026-01-01T00:00:00.000Z')
    const fenetreSuivante = new Date(debut.getTime() + windowMs)

    expect(periodStart(fenetreSuivante, windowMs)).not.toBe(periodStart(debut, windowMs))
  })

  it('rend l instant de fin exactement une fenetre apres le bucket', () => {
    const windowMs = 60_000
    const bucket = periodStart(new Date('2026-01-01T00:00:00.000Z'), windowMs)

    expect(periodEnd(bucket, windowMs).getTime()).toBe(bucket + windowMs)
  })
})

// La validation de schema exige un compte `active` en amont
// (`construireEtatCompte` se monte avant `valider` sur cette route) : ces cas
// s'executent donc dans le bloc a base reelle, avec une session authentifiee,
// sous « bornes de schema sur code, exerciseSlug et requestKey ».
describe.skipIf(!URI_TEST)('soumission de code sur une base reelle', () => {
  const service = new BaseDonneesService()
  const sessions = new SessionService()

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
    await modeleExercise().deleteMany({})
    await modeleSubmission().deleteMany({})
    await modeleQuotaCounter().deleteMany({})
  })

  async function creerUtilisateur(accountState: EtatCompte = 'active') {
    return modeleUser().create({
      displayName: 'Alice Martin',
      email: `alice-${new mongoose.Types.ObjectId().toHexString()}@exemple.test`,
      passwordHash: 'hachage-de-test',
      accountState,
    })
  }

  async function creerExercicePublie(surcharges: Record<string, unknown> = {}) {
    return modeleExercise().create({
      slug: 'addition-de-deux-nombres',
      title: 'Addition de deux nombres',
      statement: 'Ecrivez une fonction qui additionne deux nombres.',
      starterCode: 'function addition(a, b) {}',
      language: 'javascript',
      status: 'published',
      tests: [],
      ...surcharges,
    })
  }

  async function cookieDeSession(utilisateur: {
    _id: mongoose.Types.ObjectId
    accountState: EtatCompte
  }): Promise<string> {
    const ouverte = await sessions.ouvrir({ id: utilisateur._id, accountState: utilisateur.accountState })

    if (!ouverte) {
      throw new Error('session non ouverte : etat de compte insuffisant pour ce test')
    }

    return `${NOM_COOKIE_SESSION}=${ouverte.jeton}`
  }

  it('accepte une soumission valide et rend son identifiant immediatement', async () => {
    const utilisateur = await creerUtilisateur()
    await creerExercicePublie()
    const cookie = await cookieDeSession(utilisateur)

    const reponse = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisieValide())

    expect(reponse.status).toBe(201)
    expect(reponse.body.status).toBe('queued')
    expect(typeof reponse.body.id).toBe('string')
    expect(typeof reponse.body.acceptedAt).toBe('string')
    expect(await modeleSubmission().countDocuments({})).toBe(1)
  })

  it('refuse un compte non verifie, sans creer de Soumission', async () => {
    const utilisateur = await creerUtilisateur('unverified')
    await creerExercicePublie()
    const cookie = await cookieDeSession(utilisateur)

    const reponse = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisieValide())

    expect(reponse.status).toBe(403)
    expect(reponse.body.code).toBe('ETAT_COMPTE_INSUFFISANT')
    expect(reponse.body.details).toEqual({ etatCourant: 'unverified', etatExige: 'active' })
    expect(await modeleSubmission().countDocuments({})).toBe(0)
  })

  it('renvoie 404 EXERCICE_INTROUVABLE pour un slug inexistant', async () => {
    const utilisateur = await creerUtilisateur()
    const cookie = await cookieDeSession(utilisateur)

    const reponse = await request(app())
      .post(CHEMIN)
      .set('Cookie', cookie)
      .send(saisieValide({ exerciseSlug: 'slug-inexistant' }))

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('EXERCICE_INTROUVABLE')
  })

  it('renvoie 404 pour un exercice non publie, indiscernable d un exercice inexistant', async () => {
    const utilisateur = await creerUtilisateur()
    await creerExercicePublie({ slug: 'exercice-brouillon', status: 'draft' })
    const cookie = await cookieDeSession(utilisateur)

    const reponse = await request(app())
      .post(CHEMIN)
      .set('Cookie', cookie)
      .send(saisieValide({ exerciseSlug: 'exercice-brouillon' }))

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('EXERCICE_INTROUVABLE')
  })

  it('rend la meme soumission sur une resoumission de la meme cle, sans doublon ni second credit de quota', async () => {
    const utilisateur = await creerUtilisateur()
    await creerExercicePublie()
    const cookie = await cookieDeSession(utilisateur)
    const saisie = saisieValide()

    const premiere = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisie)
    const seconde = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisie)

    expect(premiere.status).toBe(201)
    expect(seconde.status).toBe(201)
    expect(seconde.body.id).toBe(premiere.body.id)
    expect(await modeleSubmission().countDocuments({})).toBe(1)

    const compteur = await modeleQuotaCounter().findOne({ userId: utilisateur._id })
    expect(compteur?.count).toBe(1)
  })

  // Exerce la branche de course (cle neuve, deux ecritures concurrentes) : la
  // perdante rencontre la violation d'index unique dans `SubmissionService`,
  // libere son quota, puis relit et rend la Soumission de la gagnante — jamais
  // une erreur. Meme patron que `base-donnees.test.ts` (« ne garde qu un
  // document quand deux insertions concurrentes portent la meme adresse »).
  it('ne cree qu une Soumission quand deux resoumissions concurrentes portent la meme cle neuve', async () => {
    const utilisateur = await creerUtilisateur()
    await creerExercicePublie()
    const cookie = await cookieDeSession(utilisateur)
    const saisie = saisieValide()
    const instance = app()
    const envoyer = () => request(instance).post(CHEMIN).set('Cookie', cookie).send(saisie)

    const resultats = await Promise.allSettled([envoyer(), envoyer()])

    expect(resultats.every((resultat) => resultat.status === 'fulfilled')).toBe(true)

    const reponses = (resultats as PromiseFulfilledResult<Awaited<ReturnType<typeof envoyer>>>[]).map(
      (resultat) => resultat.value,
    )

    for (const reponse of reponses) {
      expect(reponse.status).toBe(201)
    }

    expect(new Set(reponses.map((reponse) => reponse.body.id)).size).toBe(1)
    expect(await modeleSubmission().countDocuments({})).toBe(1)
  })

  it('renvoie 429 QUOTA_DEPASSE avec le plafond et l instant de reinitialisation quand le quota est epuise', async () => {
    const utilisateur = await creerUtilisateur()
    await creerExercicePublie()
    const cookie = await cookieDeSession(utilisateur)
    const maximum = PLAFONDS_QUOTA.executionSandbox.maximum

    for (let compte = 0; compte < maximum; compte += 1) {
      const acceptee = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisieValide())
      expect(acceptee.status).toBe(201)
    }

    const refusee = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisieValide())

    expect(refusee.status).toBe(429)
    expect(refusee.body.code).toBe('QUOTA_DEPASSE')
    expect(refusee.body.details.maximum).toBe(maximum)
    expect(typeof refusee.body.details.reinitialisationA).toBe('string')
    expect(await modeleSubmission().countDocuments({})).toBe(maximum)
  })

  describe('plafond de debit de la route (mecanisme existant, route ajoutee a PLAFONDS_PAR_ROUTE)', () => {
    it('refuse au-dela du plafond declare', async () => {
      const instance = app()
      const appeler = () =>
        request(instance).post(CHEMIN).set('X-Forwarded-For', CLIENT).send(saisieValide())

      for (let compte = 0; compte < PLAFOND_SENSIBLE.maximum; compte += 1) {
        const reponse = await appeler()
        // Sans session : refuse par `etatCompte`, avant meme la validation —
        // ce que le plafond doit compter tout de meme, puisqu il tombe avant
        // la chaine d autorisation.
        expect(reponse.status).toBe(403)
      }

      const refusee = await appeler()

      expect(refusee.status).toBe(429)
      expect(refusee.body.code).toBe('DEBIT_DEPASSE')
    })
  })

  describe('bornes de schema sur code, exerciseSlug et requestKey', () => {
    async function utilisateurConnecte() {
      const utilisateur = await creerUtilisateur()
      await creerExercicePublie()
      return cookieDeSession(utilisateur)
    }

    it('refuse un code vide', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app()).post(CHEMIN).set('Cookie', cookie).send(saisieValide({ code: '' }))

      expect(reponse.status).toBe(400)
      expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    })

    it('refuse un code compose uniquement d espaces', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app())
        .post(CHEMIN)
        .set('Cookie', cookie)
        .send(saisieValide({ code: '   \n\t  ' }))

      expect(reponse.status).toBe(400)
      expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    })

    it('refuse un exerciseSlug plus long que la borne declaree', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app())
        .post(CHEMIN)
        .set('Cookie', cookie)
        .send(saisieValide({ exerciseSlug: 'x'.repeat(LONGUEUR_MAX_SLUG_EXERCICE + 1) }))

      expect(reponse.status).toBe(400)
      expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    })

    it('refuse un exerciseSlug vide', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app())
        .post(CHEMIN)
        .set('Cookie', cookie)
        .send(saisieValide({ exerciseSlug: '' }))

      expect(reponse.status).toBe(400)
      expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    })

    it('refuse une requestKey plus longue que la borne declaree', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app())
        .post(CHEMIN)
        .set('Cookie', cookie)
        .send(saisieValide({ requestKey: 'x'.repeat(LONGUEUR_MAX_CLE_DEDUPLICATION + 1) }))

      expect(reponse.status).toBe(400)
      expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    })

    it('refuse une requestKey vide', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app())
        .post(CHEMIN)
        .set('Cookie', cookie)
        .send(saisieValide({ requestKey: '' }))

      expect(reponse.status).toBe(400)
      expect(reponse.body.code).toBe('REQUETE_INVALIDE')
    })

    it('accepte une requestKey exactement a la borne declaree', async () => {
      const cookie = await utilisateurConnecte()

      const reponse = await request(app())
        .post(CHEMIN)
        .set('Cookie', cookie)
        .send(saisieValide({ requestKey: 'x'.repeat(LONGUEUR_MAX_CLE_DEDUPLICATION) }))

      expect(reponse.status).toBe(201)
    })
  })
})
