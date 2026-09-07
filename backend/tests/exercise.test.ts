import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { LONGUEUR_MAX_SLUG_EXERCICE, NOMBRE_MAX_TESTS_EXERCICE } from '@scalar/shared/exercise.ts'
import { construireApp } from '../src/app.ts'
import { BaseDonneesService } from '../src/services/base-donnees.service.ts'
import { enregistrerModeles, modeleExercise } from '../src/models/index.ts'
import { configDeTest } from './aide-config.ts'
import { uriDeTest, verifierBaseDeTest } from './aide-base.ts'

const URI_TEST = uriDeTest('exercise')

function chemin(slug: string): string {
  return `/api/v1/exercises/${slug}`
}

function app() {
  return construireApp(configDeTest())
}

function testVisible(surcharges: Record<string, unknown> = {}) {
  return {
    name: 'additionne deux nombres',
    assertion: 'retourne la somme de a et b',
    code: 'expect(addition(2, 3)).toBe(5)',
    hidden: false,
    ...surcharges,
  }
}

function testCache(surcharges: Record<string, unknown> = {}) {
  return {
    name: 'gere les nombres negatifs',
    assertion: 'retourne une somme correcte avec des negatifs',
    code: 'expect(addition(-2, 3)).toBe(1)',
    hidden: true,
    ...surcharges,
  }
}

describe('validation du slug', () => {
  it('refuse un slug plus long que la borne declaree', async () => {
    const reponse = await request(app()).get(chemin('x'.repeat(LONGUEUR_MAX_SLUG_EXERCICE + 1)))

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('REQUETE_INVALIDE')
  })
})

// La validation du modele ne demande aucune connexion : `validate()` refuse
// avant meme qu'une ecriture ne soit tentee.
describe('bornes AD-8 du tableau de tests embarque', () => {
  beforeAll(() => {
    enregistrerModeles()
  })

  it('refuse plus de tests que le nombre maximal declare', async () => {
    const exercice = new (modeleExercise())({
      slug: 'trop-de-tests',
      title: 'Trop de tests',
      statement: 'Enonce',
      starterCode: 'function f() {}',
      language: 'javascript',
      status: 'published',
      tests: Array.from({ length: NOMBRE_MAX_TESTS_EXERCICE + 1 }, (_valeur, index) =>
        testVisible({ name: `test-${index}` }),
      ),
    })

    const erreur = await exercice.validate().then(
      () => undefined,
      (echec: unknown) => echec,
    )

    expect(erreur).toBeDefined()
    expect((erreur as { errors: Record<string, unknown> }).errors.tests).toBeDefined()
  })

  it('accepte exactement le nombre maximal declare', async () => {
    const exercice = new (modeleExercise())({
      slug: 'juste-assez-de-tests',
      title: 'Juste assez de tests',
      statement: 'Enonce',
      starterCode: 'function f() {}',
      language: 'javascript',
      status: 'published',
      tests: Array.from({ length: NOMBRE_MAX_TESTS_EXERCICE }, (_valeur, index) =>
        testVisible({ name: `test-${index}` }),
      ),
    })

    await expect(exercice.validate()).resolves.toBeUndefined()
  })

  // Un petit nombre de tests, tres loin de `NOMBRE_MAX_TESTS_EXERCICE`, mais
  // dont le `code` cumule fait depasser `OCTETS_MAX_TESTS_EXERCICE` : la borne
  // en octets doit refuser independamment de la borne en nombre.
  it('refuse un tableau qui depasse la borne en octets, meme avec peu de tests', async () => {
    const exercice = new (modeleExercise())({
      slug: 'tests-trop-lourds',
      title: 'Tests trop lourds',
      statement: 'Enonce',
      starterCode: 'function f() {}',
      language: 'javascript',
      status: 'published',
      tests: [
        testVisible({ name: 'test-1', code: 'x'.repeat(33_307) }),
        testVisible({ name: 'test-2', code: 'x'.repeat(33_307) }),
        testVisible({ name: 'test-3', code: 'x'.repeat(33_307) }),
      ],
    })

    const erreur = await exercice.validate().then(
      () => undefined,
      (echec: unknown) => echec,
    )

    expect(erreur).toBeDefined()
    expect((erreur as { errors: Record<string, unknown> }).errors.tests).toBeDefined()
  })

  // Cas compagnon, juste sous le seuil d'octets : doit passer, pour prouver
  // que la borne ne refuse pas un exercice legitime a la marge.
  it('accepte un tableau juste sous la borne en octets', async () => {
    const exercice = new (modeleExercise())({
      slug: 'tests-juste-sous-la-borne-octets',
      title: 'Tests juste sous la borne en octets',
      statement: 'Enonce',
      starterCode: 'function f() {}',
      language: 'javascript',
      status: 'published',
      tests: [
        testVisible({
          name: 'test-limite',
          assertion: 'assertion-limite',
          code: 'x'.repeat(99_919),
        }),
      ],
    })

    await expect(exercice.validate()).resolves.toBeUndefined()
  })
})

describe.skipIf(!URI_TEST)('consultation d un exercice sur une base reelle', () => {
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
    await modeleExercise().deleteMany({})
  })

  async function creerExercice(surcharges: Record<string, unknown> = {}) {
    return modeleExercise().create({
      slug: 'addition-de-deux-nombres',
      title: 'Addition de deux nombres',
      statement: 'Ecrivez une fonction qui additionne deux nombres.',
      starterCode: 'function addition(a, b) {}',
      language: 'javascript',
      status: 'published',
      tests: [
        testVisible(),
        testVisible({ name: 'gere zero' }),
        testCache(),
        testCache({ name: 'gere les grands nombres' }),
        testCache({ name: 'gere les flottants' }),
      ],
      ...surcharges,
    })
  }

  it('sert la projection publique complete d un exercice publie', async () => {
    const cree = await creerExercice()

    const reponse = await request(app()).get(chemin('addition-de-deux-nombres'))

    expect(reponse.status).toBe(200)
    expect(reponse.body.id).toBe(cree.id)
    expect(reponse.body._id).toBeUndefined()
    expect(reponse.body.slug).toBe('addition-de-deux-nombres')
    expect(reponse.body.title).toBe('Addition de deux nombres')
    expect(reponse.body.totalTests).toBe(5)
    expect(reponse.body.estVerrouille).toBe(false)
    expect(reponse.body.testsVisibles).toHaveLength(2)
    expect(reponse.body.testsCaches).toHaveLength(3)

    for (const test of reponse.body.testsVisibles) {
      expect(typeof test.code).toBe('string')
      expect(test.code.length).toBeGreaterThan(0)
    }

    for (const test of reponse.body.testsCaches) {
      expect(test.code).toBeUndefined()
      expect(typeof test.name).toBe('string')
      expect(typeof test.assertion).toBe('string')
    }
  })

  it('ne fait jamais figurer le corps d un test cache dans la reponse servie', async () => {
    await creerExercice({
      tests: [
        testVisible(),
        testCache({
          name: 'test cache marque',
          code: 'MARQUEUR_DE_CORPS_CACHE_UNIQUE',
        }),
      ],
    })

    const reponse = await request(app()).get(chemin('addition-de-deux-nombres'))

    expect(reponse.status).toBe(200)
    expect(JSON.stringify(reponse.body)).not.toContain('MARQUEUR_DE_CORPS_CACHE_UNIQUE')
  })

  it('renvoie 404 EXERCICE_INTROUVABLE pour un slug inexistant', async () => {
    const reponse = await request(app()).get(chemin('slug-inexistant'))

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('EXERCICE_INTROUVABLE')
  })

  it('renvoie 404 pour un exercice non publie, indiscernable d un exercice inexistant', async () => {
    await creerExercice({ slug: 'exercice-brouillon', status: 'draft' })

    const brouillon = await request(app()).get(chemin('exercice-brouillon'))
    const inexistant = await request(app()).get(chemin('slug-inexistant'))

    expect(brouillon.status).toBe(404)
    expect(brouillon.body.code).toBe('EXERCICE_INTROUVABLE')
    expect(brouillon.body).toEqual(inexistant.body)
  })

  it('renvoie 404 pour un exercice archive ou en revue', async () => {
    await creerExercice({ slug: 'exercice-en-revue', status: 'in_review' })
    await creerExercice({ slug: 'exercice-archive', status: 'archived' })

    const enRevue = await request(app()).get(chemin('exercice-en-revue'))
    const archive = await request(app()).get(chemin('exercice-archive'))

    expect(enRevue.status).toBe(404)
    expect(archive.status).toBe(404)
  })
})
