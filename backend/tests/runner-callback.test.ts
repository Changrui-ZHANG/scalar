import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { construireApp } from '../src/app.ts'
import { BaseDonneesService } from '../src/services/base-donnees.service.ts'
import { modeleExercise, modeleSubmission, modeleUser } from '../src/models/index.ts'
import {
  configDeTest,
  SECRET_RUNNER_RAPPEL_DE_TEST,
} from './aide-config.ts'
import { uriDeTest, verifierBaseDeTest } from './aide-base.ts'

const URI_TEST = uriDeTest('runner-callback')
const EN_TETE_SECRET = 'x-scalar-runner-secret'

function app() {
  return construireApp(configDeTest())
}

function corpsValide(surcharges: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    exitCode: 0,
    signal: null,
    output: 'tout va bien',
    outputTruncated: false,
    finishedAt: new Date().toISOString(),
    timedOut: false,
    tests: [],
    ...surcharges,
  }
}

// Le rappel runner -> API (AD-16, AD-24) : jamais la chaine
// session/etatCompte, seulement le secret compare en temps constant.
describe.skipIf(!URI_TEST)('rappel runner sur une base reelle', () => {
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
    await modeleExercise().deleteMany({})
    await modeleSubmission().deleteMany({})
  })

  async function creerSoumission() {
    const utilisateur = await modeleUser().create({
      displayName: 'Alice Martin',
      email: `alice-${new mongoose.Types.ObjectId().toHexString()}@exemple.test`,
      passwordHash: 'hachage-de-test',
      accountState: 'active',
    })
    const exercice = await modeleExercise().create({
      slug: 'addition-de-deux-nombres',
      title: 'Addition de deux nombres',
      statement: 'Ecrivez une fonction qui additionne deux nombres.',
      starterCode: 'function addition(a, b) {}',
      language: 'javascript',
      status: 'published',
      tests: [],
    })

    return modeleSubmission().create({
      userId: utilisateur._id,
      exerciseId: exercice._id,
      exerciseSlug: exercice.slug,
      code: 'function addition(a, b) { return a + b }',
      requestKey: `cle-${new mongoose.Types.ObjectId().toHexString()}`,
      status: 'queued',
      acceptedAt: new Date(),
    })
  }

  it('refuse 401 sans le secret, sans ecrire la Soumission', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .send(corpsValide())

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('SECRET_SERVICE_INVALIDE')

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.status).toBe('queued')
    expect(relue?.rawExitCode).toBeUndefined()
  })

  it('refuse 401 avec un secret errone', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, 'un-secret-completement-different-32')
      .send(corpsValide())

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('SECRET_SERVICE_INVALIDE')
  })

  it('refuse 400 un corps hors du schema ferme', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send({ exitCode: 0 })

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('TRAVAIL_RUNNER_INVALIDE')
  })

  it('refuse 400 un submissionId mal forme, avant toute lecture en base', async () => {
    const reponse = await request(app())
      .post('/api/v1/runner-callbacks/pas-un-object-id')
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide())

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('TRAVAIL_RUNNER_INVALIDE')
  })

  it('refuse 404 un submissionId bien forme mais introuvable', async () => {
    const idInexistant = new mongoose.Types.ObjectId().toHexString()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${idInexistant}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide())

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('SOUMISSION_INTROUVABLE')
  })

  it('ecrit le resultat brut et passe (ou reste) running avec le bon secret, verdict passed sur exitCode 0', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide({ output: 'sortie du conteneur', exitCode: 0, signal: null }))

    expect(reponse.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.status).toBe('running')
    expect(relue?.rawExitCode).toBe(0)
    expect(relue?.rawOutput).toBe('sortie du conteneur')
    expect(relue?.rawOutputTronque).toBe(false)
    expect(relue?.finishedAt).toBeInstanceOf(Date)
    expect(relue?.startedAt).toBeInstanceOf(Date)
    expect(relue?.verdict).toBe('passed')
    expect(relue?.failureOrigin).toBeUndefined()
    expect(relue?.toObject().progressionEffect).toEqual({ status: 'pending' })
  })

  it('classe failed avec le detail par test quand une assertion echoue', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(
        corpsValide({
          exitCode: 1,
          firstTestAt: new Date().toISOString(),
          tests: [{ name: 'addition', status: 'failed', expected: '5', actual: '4' }],
        }),
      )

    expect(reponse.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.verdict).toBe('failed')
    expect(relue?.failureOrigin).toBe('apprenant')
    expect(relue?.toObject().testResults).toEqual([
      { index: 0, name: 'addition', status: 'failed', expected: '5', actual: '4' },
    ])
  })

  it('classe error/typage quand la compilation TypeScript echoue avant tout test', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide({ exitCode: 2, output: 'soumission.ts(1,1): erreur de typage' }))

    expect(reponse.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.verdict).toBe('error')
    expect(relue?.failureOrigin).toBe('apprenant')
    expect(relue?.firstTestAt).toBeUndefined()
  })

  it('classe error/execution quand le process crashe hors assertion apres le demarrage des tests', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide({ exitCode: 1, firstTestAt: new Date().toISOString(), tests: [] }))

    expect(reponse.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.verdict).toBe('error')
    expect(relue?.failureOrigin).toBe('apprenant')
    expect(relue?.firstTestAt).toBeInstanceOf(Date)
  })

  it('classe timeout quand timedOut est vrai, quel que soit le code de sortie', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide({ exitCode: null, signal: 'SIGKILL', timedOut: true }))

    expect(reponse.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.verdict).toBe('timeout')
    expect(relue?.failureOrigin).toBe('apprenant')
  })

  it('classe error/plateforme quand exitCode est nul hors timeout (echec runner avant toute execution)', async () => {
    const soumission = await creerSoumission()

    const reponse = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(
        corpsValide({
          exitCode: null,
          signal: null,
          timedOut: false,
          output: 'Echec interne du runner, avant toute execution : demon injoignable',
        }),
      )

    expect(reponse.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.verdict).toBe('error')
    expect(relue?.failureOrigin).toBe('plateforme')
  })

  it('garde le verdict deja ecrit sur un rappel tardif, et ne complete que sortie et detail', async () => {
    const soumission = await creerSoumission()

    const premier = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(corpsValide({ exitCode: 0, output: 'premiere sortie' }))

    expect(premier.status).toBe(204)

    const tardif = await request(app())
      .post(`/api/v1/runner-callbacks/${soumission.id}`)
      .set(EN_TETE_SECRET, SECRET_RUNNER_RAPPEL_DE_TEST)
      .send(
        corpsValide({
          exitCode: 1,
          output: 'sortie tardive',
          tests: [{ name: 'addition', status: 'failed' }],
        }),
      )

    expect(tardif.status).toBe(204)

    const relue = await modeleSubmission().findById(soumission.id)
    expect(relue?.verdict).toBe('passed')
    expect(relue?.failureOrigin).toBeUndefined()
    expect(relue?.rawOutput).toBe('sortie tardive')
    expect(relue?.toObject().testResults).toEqual([{ index: 0, name: 'addition', status: 'failed' }])
  })
})
