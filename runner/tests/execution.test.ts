import { execFile } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { TRONCATURE_SORTIE_LIGNES_MAX } from '@scalar/shared/limites.ts'
import type { RunnerJob } from '@scalar/shared/runner.ts'
import { invoquerConteneur } from '../src/execution/invoquerConteneur.ts'

// Contre un demon Docker reel (convention Tests), jamais simule — meme
// patron que le pic (`spike/sandbox-2-1/lancer.ts`), assertions vitest.
// Chaque cas lance et detruit un conteneur reel : lent au regard d'un test
// unitaire, rapide au regard de ce qu'il prouve.

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

function job(surcharges: Partial<RunnerJob> = {}): RunnerJob {
  return {
    languageId: 'javascript',
    code: 'function additionner(a, b) { return a + b }',
    tests: [
      {
        name: 'additionne deux entiers',
        code: "test('additionne deux entiers', () => { assert.equal(additionner(2, 3), 5) })",
      },
    ],
    ...surcharges,
  }
}

describe('invoquerConteneur (Docker reel)', () => {
  it('rend passed (code 0) pour un cas nominal, et ne laisse aucun conteneur survivre', async () => {
    const resultat = await invoquerConteneur(job())

    expect(resultat.exitCode).toBe(0)
    expect(resultat.timedOut).toBe(false)
    expect(await conteneursDuRunner()).toEqual([])
  }, 30_000)

  it('rend un code non nul et le detail par test quand une assertion echoue', async () => {
    const resultat = await invoquerConteneur(
      job({
        tests: [
          {
            name: 'assertion fausse',
            code: "test('assertion fausse', () => { assert.equal(additionner(2, 2), 5) })",
          },
        ],
      }),
    )

    expect(resultat.exitCode).not.toBe(0)
    expect(resultat.timedOut).toBe(false)
    expect(resultat.tests).toEqual([
      { name: 'assertion fausse', status: 'failed', expected: '5', actual: '4' },
    ])
    expect(resultat.firstTestAt).toEqual(expect.any(String))
  }, 30_000)

  it('echoue avant tout test quand le type soumis est invalide, avec le code de sortie dedie', async () => {
    const resultat = await invoquerConteneur(
      job({
        code: 'function additionner(a: number, b: number): number { return a + b }',
        tests: [
          {
            name: 'type invalide',
            code: "test('type invalide', () => { additionner('deux', 3) })",
          },
        ],
      }),
    )

    expect(resultat.exitCode).toBe(2)
    expect(resultat.timedOut).toBe(false)
    expect(resultat.tests).toEqual([])
    expect(resultat.firstTestAt).toBeUndefined()
    expect(resultat.output).toContain('soumission.ts')
  }, 30_000)

  it('distingue une assertion echouee d une exception non interceptee hors assertion', async () => {
    const resultat = await invoquerConteneur(
      job({
        code: '',
        tests: [
          {
            name: 'exception non interceptee',
            code: "test('exception non interceptee', () => { throw new Error('boum') })",
          },
        ],
      }),
    )

    expect(resultat.exitCode).not.toBe(0)
    expect(resultat.timedOut).toBe(false)
    // Un throw ordinaire a l'interieur d'un test n'est pas une assertion
    // `node:assert` : jamais ajoute au detail par test, pour que
    // `submission.service` le classe `error` (famille execution) plutot que
    // `failed` (voir spec-2-6, matrice I/O).
    expect(resultat.tests).toEqual([])
    expect(resultat.firstTestAt).toEqual(expect.any(String))
  }, 30_000)

  it('coupe l acces reseau : une tentative de sortie echoue toujours', async () => {
    const resultat = await invoquerConteneur(
      job({
        code: '',
        tests: [
          {
            name: 'reseau coupe',
            code: `test('reseau coupe', async () => {
              await assert.rejects(fetch('http://example.com'))
            })`,
          },
        ],
      }),
    )

    expect(resultat.exitCode).toBe(0)
  }, 30_000)

  it('tue par l hote un conteneur qui depasse la duree declaree, et le detruit quand meme', async () => {
    const resultat = await invoquerConteneur(
      job({
        code: '',
        tests: [{ name: 'boucle infinie', code: "test('boucle infinie', () => { while (true) {} })" }],
      }),
    )

    expect(resultat.timedOut).toBe(true)
    expect(resultat.signal).toBe('SIGKILL')
    expect(await conteneursDuRunner()).toEqual([])
  }, 40_000)

  it('tronque une sortie qui depasse le plafond de lignes declare, et le signale', async () => {
    const resultat = await invoquerConteneur(
      job({
        code: '',
        tests: [
          {
            name: 'sortie volumineuse',
            code: `test('sortie volumineuse', () => {
              for (let i = 0; i < ${TRONCATURE_SORTIE_LIGNES_MAX + 500}; i += 1) console.log('ligne ' + i)
            })`,
          },
        ],
      }),
    )

    expect(resultat.outputTruncated).toBe(true)
    expect(resultat.output.split('\n').length).toBeLessThanOrEqual(TRONCATURE_SORTIE_LIGNES_MAX + 1)
  }, 30_000)

  it('ne laisse fuir aucun etat d une execution a la suivante', async () => {
    const ecriture = await invoquerConteneur(
      job({
        code: '',
        tests: [
          {
            name: 'ecrit un marqueur',
            code: `import { writeFileSync } from 'node:fs'
            test('ecrit un marqueur', () => {
              writeFileSync('/work/marqueur.txt', 'fuite')
            })`,
          },
        ],
      }),
    )

    expect(ecriture.exitCode).toBe(0)

    const lecture = await invoquerConteneur(
      job({
        code: '',
        tests: [
          {
            name: 'ne retrouve pas le marqueur',
            code: `import { existsSync } from 'node:fs'
            test('ne retrouve pas le marqueur', () => {
              assert.equal(existsSync('/work/marqueur.txt'), false)
            })`,
          },
        ],
      }),
    )

    expect(lecture.exitCode).toBe(0)
  }, 30_000)

  it('nomme chaque conteneur de facon unique meme pour deux executions concurrentes', async () => {
    const [premier, second] = await Promise.all([invoquerConteneur(job()), invoquerConteneur(job())])

    expect(premier.exitCode).toBe(0)
    expect(second.exitCode).toBe(0)
    expect(await conteneursDuRunner()).toEqual([])
  }, 30_000)
})
