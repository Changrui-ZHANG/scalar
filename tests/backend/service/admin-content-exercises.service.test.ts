import { spawnSync } from 'node:child_process'

import { beforeEach, describe, expect, it } from 'vitest'

import { chapter, exercise, testCase, track } from '../content.fixtures.ts'
import { MESSAGES } from '../../../backend/src/constants.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import type { AdminOutcome } from '../../../backend/src/service/admin-content.service.ts'
import { AdminContentService } from '../../../backend/src/service/admin-content.service.ts'
import type { ExecutionResult } from '../../../backend/src/service/execution.service.ts'
import { EngineUnavailableError } from '../../../backend/src/service/execution.service.ts'

const NOW = new Date('2026-11-08T10:00:00Z')
const JS_CHAPTER = 10
const TS_CHAPTER = 11
const NO_LANGUAGE_CHAPTER = 12
const LIVE = 100
const DRAFT = 101
const NO_CASES = 102
const TS_DRAFT = 103
const DOUBLE = 'function f(n) { return n * 2 }'
const CASES = [{ arguments: [2], expectedResult: 4, isHidden: false, description: null }]
const NEW_EXERCISE = {
  slug: 'double',
  title: 'Double',
  instructions: 'Renvoie le double.',
  functionName: 'f',
  starterCode: 'function f(n) {}',
  solutionCode: DOUBLE,
}
const unchecked = {
  status: 'draft',
  firstPublishedAt: null,
  solutionCheckStatus: 'not_checked',
  solutionCheckedAt: null,
} as const

async function runInNode(code: string): Promise<ExecutionResult> {
  const run = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' })
  return {
    status: run.status === 0 ? 'OK' : 'RE',
    label: '',
    run: {
      stdout: run.stdout,
      stderr: run.stderr,
      output: run.stdout + run.stderr,
      code: run.status,
      signal: null,
      status: null,
    },
  }
}

const saved = <T>(outcome: AdminOutcome<T>): T => {
  if (outcome.status !== 'saved') {
    throw new Error(outcome.status)
  }
  return outcome.item
}

let repository: InMemoryAdminContentRepository
let service: AdminContentService

const serviceWith = (execute: (code: string) => Promise<ExecutionResult>) =>
  new AdminContentService(repository, () => NOW, execute)

beforeEach(() => {
  repository = new InMemoryAdminContentRepository(
    [
      track(1, 'javascript', 1),
      track(2, 'typescript', 2, { programmingLanguage: 'typescript' }),
      track(3, 'conception', 3, { programmingLanguage: null }),
    ],
    [
      chapter(JS_CHAPTER, 1, 'boucles', 'beginner', 1),
      chapter(TS_CHAPTER, 2, 'types', 'beginner', 1),
      chapter(NO_LANGUAGE_CHAPTER, 3, 'principes', 'beginner', 1),
    ],
    [],
    [
      exercise(LIVE, JS_CHAPTER, 'en-ligne', 1, { solutionCode: DOUBLE }),
      exercise(DRAFT, JS_CHAPTER, 'brouillon', 2, { ...unchecked, solutionCode: DOUBLE }),
      exercise(NO_CASES, JS_CHAPTER, 'sans-cas', 3, unchecked),
      exercise(TS_DRAFT, TS_CHAPTER, 'type', 1, {
        ...unchecked,
        solutionCode: 'function f(n: number): number { return n * 2 }',
      }),
    ],
    [
      testCase(1, LIVE, 1, { arguments: [2], expectedResult: 4 }),
      testCase(2, DRAFT, 1, { arguments: [2], expectedResult: 4 }),
      testCase(3, DRAFT, 2, { arguments: [3], expectedResult: 6, isHidden: true }),
      testCase(4, TS_DRAFT, 1, { arguments: [2], expectedResult: 4 }),
    ],
  )
  service = serviceWith(runInNode)
})

describe('AdminContentService : création d’un exercice', () => {
  it('crée en brouillon non vérifié, à la fin du chapitre, cas numérotés dans l’ordre', async () => {
    const created = saved(
      await service.createExercise(JS_CHAPTER, {
        ...NEW_EXERCISE,
        hints: ['Multiplie.'],
        testCases: [
          ...CASES,
          { arguments: [0], expectedResult: 0, isHidden: true, description: 'zéro' },
        ],
      }),
    )

    expect(created).toMatchObject({ ...unchecked, position: 4, hints: ['Multiplie.'] })
    expect(created.testCases.map((t) => [t.position, t.isHidden])).toEqual([
      [1, false],
      [2, true],
    ])
  })

  it('accepte un exercice sans indice ni cas, et un résultat attendu null', async () => {
    expect(saved(await service.createExercise(JS_CHAPTER, NEW_EXERCISE))).toMatchObject({
      hints: [],
      testCases: [],
    })

    const withNull = await service.createExercise(JS_CHAPTER, {
      ...NEW_EXERCISE,
      slug: 'rien',
      testCases: [{ arguments: [], expectedResult: null }],
    })
    expect(saved(withNull).testCases[0]).toMatchObject({
      expectedResult: null,
      isHidden: false,
      description: null,
    })
  })

  it.each([
    ['un nom de fonction invalide', { functionName: 'a b; evil()' }, 'functionName'],
    ['un code vide', { solutionCode: '   ' }, 'solutionCode'],
    ['un quatrième indice', { hints: ['a', 'b', 'c', 'd'] }, 'hints'],
    ['un champ inconnu', { titre: 'X' }, 'titre'],
    ['un statut imposé à la création', { status: 'published' }, 'status'],
    [
      'des arguments qui ne sont pas un tableau',
      { testCases: [{ arguments: 1, expectedResult: 1 }] },
      'testCases.0.arguments',
    ],
    [
      'un résultat attendu absent',
      { testCases: [{ arguments: [] }] },
      'testCases.0.expectedResult',
    ],
    [
      'des arguments trop volumineux',
      { testCases: [{ arguments: ['x'.repeat(2_000)], expectedResult: 1 }] },
      'testCases.0.arguments',
    ],
  ])('refuse %s en nommant le champ', async (_name, extra, field) => {
    expect(await service.createExercise(JS_CHAPTER, { ...NEW_EXERCISE, ...extra })).toEqual({
      status: 'invalid',
      error: `${MESSAGES.invalidField} ${field}.`,
    })
  })

  it('refuse un chapitre inconnu, un slug déjà pris, un parcours sans langage', async () => {
    expect(await service.createExercise(99, NEW_EXERCISE)).toEqual({ status: 'not-found' })
    expect(await service.createExercise(JS_CHAPTER, { ...NEW_EXERCISE, slug: 'en-ligne' })).toEqual(
      { status: 'slug-taken' },
    )
    expect(await service.createExercise(NO_LANGUAGE_CHAPTER, NEW_EXERCISE)).toEqual({
      status: 'no-language',
    })
  })
})

describe('AdminContentService : modification d’un exercice', () => {
  beforeEach(async () => {
    saved(await service.checkSolution(DRAFT))
  })

  it.each([
    ['la solution', { solutionCode: 'function f(n) { return 2 * n }' }],
    ['le code de départ', { starterCode: 'function f(x) {}' }],
    ['le nom de la fonction', { functionName: 'g' }],
    ['les cas de test', { testCases: CASES }],
  ])('remet la vérification à zéro quand %s change', async (_name, changes) => {
    expect(saved(await service.updateExercise(DRAFT, changes))).toMatchObject({
      solutionCheckStatus: 'not_checked',
      solutionCheckedAt: null,
    })
  })

  it('garde la vérification pour un titre, une consigne ou des valeurs renvoyées inchangées', async () => {
    const current = (await service.findExercise(DRAFT))!
    const resent = {
      title: 'Nouveau titre',
      solutionCode: current.solutionCode,
      testCases: current.testCases.map((t) => ({
        arguments: t.arguments,
        expectedResult: t.expectedResult,
        isHidden: t.isHidden,
        description: t.description,
      })),
    }

    expect(saved(await service.updateExercise(DRAFT, resent))).toMatchObject({
      title: 'Nouveau titre',
      solutionCheckStatus: 'passed',
    })
  })

  it('remplace toute la liste des cas de test', async () => {
    const updated = saved(await service.updateExercise(DRAFT, { testCases: CASES }))

    expect(updated.testCases).toHaveLength(1)
    expect(updated.testCases[0]).toMatchObject({ position: 1, arguments: [2] })
  })

  it('refuse un exercice inconnu et un champ inconnu', async () => {
    expect(await service.updateExercise(99, { title: 'X' })).toEqual({ status: 'not-found' })
    expect(await service.updateExercise(DRAFT, { titre: 'X' })).toMatchObject({
      status: 'invalid',
    })
  })
})

describe('AdminContentService : exercice publié', () => {
  it.each([
    ['sa solution', { solutionCode: 'function f() { return 0 }' }],
    ['ses cas de test', { testCases: CASES.map((c) => ({ ...c, expectedResult: 5 })) }],
  ])('refuse de modifier %s tant qu’il reste publié', async (_name, changes) => {
    expect(await service.updateExercise(LIVE, changes)).toEqual({ status: 'exercise-locked' })
    expect((await service.findExercise(LIVE))?.solutionCheckStatus).toBe('passed')
  })

  it('laisse corriger le titre, la consigne et les indices', async () => {
    expect(
      saved(await service.updateExercise(LIVE, { title: 'Mieux', hints: ['Un indice.'] })),
    ).toMatchObject({ title: 'Mieux', status: 'published', solutionCheckStatus: 'passed' })
  })

  it('accepte le code une fois repassé en brouillon, et remet la vérification à zéro', async () => {
    expect(
      saved(
        await service.updateExercise(LIVE, {
          status: 'draft',
          solutionCode: 'function f(n) { return n + n }',
        }),
      ),
    ).toMatchObject({ status: 'draft', solutionCheckStatus: 'not_checked' })
  })

  it('fige son slug et interdit sa suppression', async () => {
    expect(await service.updateExercise(LIVE, { slug: 'autre' })).toEqual({ status: 'slug-locked' })
    expect(await service.deleteExercise(LIVE)).toEqual({ status: 'published-once' })
  })
})

describe('AdminContentService : publication', () => {
  it('refuse une solution jamais vérifiée', async () => {
    expect(await service.updateExercise(DRAFT, { status: 'published' })).toEqual({
      status: 'solution-not-checked',
    })
  })

  it('refuse une solution vérifiée mais fausse', async () => {
    await service.updateExercise(DRAFT, { solutionCode: 'function f() { return 0 }' })
    await service.checkSolution(DRAFT)

    expect(await service.updateExercise(DRAFT, { status: 'published' })).toEqual({
      status: 'solution-not-checked',
    })
  })

  it('refuse de publier et de changer le code dans la même requête', async () => {
    await service.checkSolution(DRAFT)

    expect(
      await service.updateExercise(DRAFT, {
        status: 'published',
        solutionCode: 'function f() { return 0 }',
      }),
    ).toEqual({ status: 'solution-not-checked' })
  })

  it('publie une solution vérifiée et date la première publication', async () => {
    await service.checkSolution(DRAFT)

    expect(saved(await service.updateExercise(DRAFT, { status: 'published' }))).toMatchObject({
      status: 'published',
      firstPublishedAt: NOW,
    })
  })

  it('exige une nouvelle vérification pour republier un exercice archivé puis modifié', async () => {
    await service.updateExercise(LIVE, { status: 'archived' })
    await service.updateExercise(LIVE, { solutionCode: 'function f(n) { return n + n }' })

    expect(await service.updateExercise(LIVE, { status: 'published' })).toEqual({
      status: 'solution-not-checked',
    })
  })
})

describe('AdminContentService : suppression', () => {
  it('supprime un brouillon, puis ne le trouve plus', async () => {
    expect(await service.deleteExercise(DRAFT)).toEqual({ status: 'deleted' })
    expect(await service.deleteExercise(DRAFT)).toEqual({ status: 'not-found' })
  })

  it('refuse de supprimer un chapitre qui a encore un exercice', async () => {
    expect(await service.deleteChapter(2, TS_CHAPTER)).toEqual({ status: 'published-once' })

    const created = await service.createChapter(1, {
      slug: 'neuf',
      level: 'advanced',
      title: 'Neuf',
      summary: 'Neuf.',
    })
    if (created.status !== 'saved') {
      throw new Error(created.status)
    }
    await service.createExercise(created.item.id, NEW_EXERCISE)

    expect(await service.deleteChapter(1, created.item.id)).toEqual({ status: 'in-use' })
  })
})

describe('AdminContentService : vérification de la solution', () => {
  it('enregistre une réussite et détaille aussi les cas cachés', async () => {
    const outcome = await service.checkSolution(DRAFT)

    expect(outcome).toMatchObject({
      status: 'saved',
      item: {
        passed: true,
        stderr: '',
        exercise: { solutionCheckStatus: 'passed', solutionCheckedAt: NOW },
      },
    })
    if (outcome.status === 'saved') {
      expect(outcome.item.checks.at(-1)?.label).toContain('f(3) renvoie 6')
    }
  })

  it('enregistre un échec avec le cas fautif et la valeur obtenue', async () => {
    await service.updateExercise(DRAFT, { solutionCode: 'function f(n) { return n }' })

    const outcome = await service.checkSolution(DRAFT)

    expect(outcome).toMatchObject({
      item: { passed: false, exercise: { solutionCheckStatus: 'failed' } },
    })
    if (outcome.status === 'saved') {
      expect(outcome.item.checks.at(-1)).toMatchObject({ passed: false, detail: 'Obtenu : 3' })
    }
  })

  it('retire les types d’une solution TypeScript avant de l’exécuter', async () => {
    expect(await service.checkSolution(TS_DRAFT)).toMatchObject({ item: { passed: true } })
  })

  it('enregistre un échec si le TypeScript n’est pas convertible, sans appeler le moteur', async () => {
    await service.updateExercise(TS_DRAFT, { solutionCode: 'enum E { A }\nfunction f() {}' })
    let executions = 0
    const counting = serviceWith(async (code) => {
      executions += 1
      return runInNode(code)
    })

    expect(await counting.checkSolution(TS_DRAFT)).toMatchObject({
      item: { passed: false, exercise: { solutionCheckStatus: 'failed' } },
    })
    expect(executions).toBe(0)
  })

  it('refuse un exercice inconnu, ou sans cas de test', async () => {
    expect(await service.checkSolution(99)).toEqual({ status: 'not-found' })
    expect(await service.checkSolution(NO_CASES)).toEqual({ status: 'no-test-cases' })
  })

  it('refuse si le parcours a perdu son langage', async () => {
    await service.updateTrack(1, { programmingLanguage: null })

    expect(await service.checkSolution(DRAFT)).toEqual({ status: 'no-language' })
  })

  it('laisse le statut intact si le moteur est indisponible', async () => {
    const down = serviceWith(async () => {
      throw new EngineUnavailableError(new Error('panne'))
    })

    await expect(down.checkSolution(DRAFT)).rejects.toBeInstanceOf(EngineUnavailableError)
    expect((await service.findExercise(DRAFT))?.solutionCheckStatus).toBe('not_checked')
  })

  it('n’enregistre pas un verdict devenu caduc : l’exercice a changé pendant l’exécution', async () => {
    const racing = serviceWith(async (code) => {
      await service.updateExercise(DRAFT, { solutionCode: 'function f() { return 0 }' })
      return runInNode(code)
    })

    expect(await racing.checkSolution(DRAFT)).toEqual({ status: 'check-outdated' })
    expect((await service.findExercise(DRAFT))?.solutionCheckStatus).toBe('not_checked')
  })
})
