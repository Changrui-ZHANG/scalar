import { execFile } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { construireApp } from '../src/app.ts'
import type { Config } from '../src/config.ts'

const EN_TETE_SECRET = 'x-scalar-runner-secret'

function configDeTest(surcharges: Partial<Config> = {}): Config {
  return {
    NODE_ENV: 'test',
    PORT: 4000,
    SECRET_RUNNER_DEPOT: 'd'.repeat(32),
    SECRET_RUNNER_RAPPEL: 'r'.repeat(32),
    // Adresse ou rien n'ecoute : un rappel de fin d'execution y echoue vite
    // et sans consequence pour ces cas, qui ne portent pas sur le rappel.
    URL_RAPPEL_API: 'http://127.0.0.1:1/runner-callbacks',
    PLAFOND_CONCURRENCE: 4,
    ...surcharges,
  }
}

function docker(args: readonly string[]): Promise<{ code: number; sortie: string }> {
  return new Promise((resoudre) => {
    execFile('docker', [...args], (erreur, stdout, stderr) => {
      const code = erreur === null ? 0 : typeof erreur.code === 'number' ? erreur.code : Number.NaN
      resoudre({ code, sortie: `${stdout}${stderr}` })
    })
  })
}

async function conteneursDuRunner(): Promise<string[]> {
  const { sortie } = await docker(['ps', '-aq', '--filter', 'label=scalar-runner'])

  return sortie
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => /^[0-9a-f]{6,}$/.test(ligne))
}

// L'execution reelle continue derriere la reponse HTTP deja partie : une
// attente fixe reste une supposition sur la duree du systeme charge, pas une
// garantie. Interroger jusqu'a disparition, borne par un delai maximal,
// evite qu'une machine ponctuellement lente fasse echouer le controle
// « aucun conteneur ne survit » pour la mauvaise raison.
async function attendreAucunConteneur(delaiMaxMs: number): Promise<string[]> {
  const echeance = Date.now() + delaiMaxMs

  while (Date.now() < echeance) {
    const restants = await conteneursDuRunner()
    if (restants.length === 0) return restants
    await new Promise((resoudre) => setTimeout(resoudre, 500))
  }

  return conteneursDuRunner()
}

function jobValide(): Record<string, unknown> {
  return { languageId: 'javascript', code: '', tests: [] }
}

describe('POST /executions/:submissionId — garde et forme fermee (AD-3, AD-16)', () => {
  it('refuse 401 sans secret, avant toute validation du travail', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .post('/executions/abc')
      .send(jobValide())

    expect(reponse.status).toBe(401)
    expect(reponse.body.code).toBe('SECRET_SERVICE_INVALIDE')
  })

  it('refuse 401 avec un secret errone', async () => {
    const reponse = await request(construireApp(configDeTest()))
      .post('/executions/abc')
      .set(EN_TETE_SECRET, 'un-secret-completement-different-32')
      .send(jobValide())

    expect(reponse.status).toBe(401)
  })

  it('refuse 400 un travail portant une cle etrangere, avant tout lancement de conteneur', async () => {
    const config = configDeTest()

    const reponse = await request(construireApp(config))
      .post('/executions/abc')
      .set(EN_TETE_SECRET, config.SECRET_RUNNER_DEPOT)
      .send({ ...jobValide(), image: 'autre-image-arbitraire' })

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('TRAVAIL_RUNNER_INVALIDE')
    expect(await conteneursDuRunner()).toEqual([])
  })

  it('refuse 400 un languageId hors du registre ferme', async () => {
    const config = configDeTest()

    const reponse = await request(construireApp(config))
      .post('/executions/abc')
      .set(EN_TETE_SECRET, config.SECRET_RUNNER_DEPOT)
      .send({ ...jobValide(), languageId: 'python' })

    expect(reponse.status).toBe(400)
    expect(reponse.body.code).toBe('TRAVAIL_RUNNER_INVALIDE')
  })

  it('refuse 404 une route inconnue', async () => {
    const reponse = await request(construireApp(configDeTest())).get('/autre-chose')

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('ROUTE_INTROUVABLE')
  })
})

describe('POST /executions/:submissionId — admission reelle (Docker reel)', () => {
  afterEach(async () => {
    const restants = await conteneursDuRunner()
    if (restants.length > 0) await docker(['rm', '-f', ...restants])
  })

  it('admet un travail valide et lance reellement une execution en tache de fond', async () => {
    const config = configDeTest()

    const reponse = await request(construireApp(config))
      .post('/executions/soumission-1')
      .set(EN_TETE_SECRET, config.SECRET_RUNNER_DEPOT)
      .send({
        languageId: 'javascript',
        code: 'function additionner(a, b) { return a + b }',
        tests: [{ name: 'additionne', code: "test('additionne', () => { assert.equal(additionner(2, 3), 5) })" }],
      })

    expect(reponse.status).toBe(202)
    expect(reponse.body).toEqual({ admis: true })

    expect(await attendreAucunConteneur(20_000)).toEqual([])
  }, 30_000)

  it('met en file au-dela du plafond de concurrence declare, sans jamais refuser', async () => {
    const config = configDeTest({ PLAFOND_CONCURRENCE: 1 })
    const app = construireApp(config)
    // 1s suffit a garantir que la premiere execution est encore en vol
    // quand la seconde requete arrive (envoyee juste apres, sans attendre) ;
    // au-dela, ce n'est plus la duree du calcul qui est sous test mais le
    // budget du test lui-meme — deux executions **sequentielles** (la
    // seconde n'entame la sienne qu'a la fin de la premiere, par
    // construction) et leur cout fixe de conteneur (creation, attache, tar,
    // destruction) s'additionnent, et un demon charge allonge ce cout fixe
    // bien plus qu'il n'allonge une boucle d'une seconde.
    const job = {
      languageId: 'javascript',
      code: '',
      tests: [{ name: 'boucle', code: "test('boucle', () => { const fin = Date.now() + 1000; while (Date.now() < fin) {} })" }],
    }

    const premiere = await request(app)
      .post('/executions/soumission-premiere')
      .set(EN_TETE_SECRET, config.SECRET_RUNNER_DEPOT)
      .send(job)
    const seconde = await request(app)
      .post('/executions/soumission-seconde')
      .set(EN_TETE_SECRET, config.SECRET_RUNNER_DEPOT)
      .send(job)

    expect(premiere.body).toEqual({ admis: true })
    expect(seconde.body).toEqual({ admis: false, position: 1 })

    expect(await attendreAucunConteneur(30_000)).toEqual([])
  }, 40_000)
})
