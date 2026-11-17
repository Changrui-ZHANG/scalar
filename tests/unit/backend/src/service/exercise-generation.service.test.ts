import { spawnSync } from 'node:child_process'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { chapter, exercise, track } from '../../../../fixtures/backend/content.fixtures.ts'
import { InMemoryAdminContentRepository } from '../../../../../backend/src/repository/admin-content.repository.ts'
import { AdminContentService } from '../../../../../backend/src/service/admin-content.service.ts'
import type { AdminOutcome } from '../../../../../backend/src/service/admin-content.service.ts'
import { AiUnavailableError } from '../../../../../backend/src/service/ai-unavailable.error.ts'
import type { ExecutionResult } from '../../../../../backend/src/service/execution.service.ts'
import { EngineUnavailableError } from '../../../../../backend/src/service/execution.service.ts'
import type {
  ExerciseGenerator,
  GeneratedExercise,
} from '../../../../../backend/src/service/exercise-generator.ts'
import { ExerciseGenerationService } from '../../../../../backend/src/service/exercise-generation.service.ts'

const NOW = new Date('2026-11-17T10:00:00Z')
const JS_CHAPTER = 10
const NO_LANGUAGE_CHAPTER = 12

const AI_EXERCISE: GeneratedExercise = {
  slug: 'somme-tableau',
  title: 'Somme d’un tableau',
  instructions: 'Écris `somme(nombres)` qui renvoie la somme des nombres du tableau.',
  functionName: 'somme',
  starterCode: 'function somme(nombres) {\n  // à toi\n}',
  solutionCode: 'function somme(nombres) { let s = 0; for (const n of nombres) s += n; return s }',
  hints: ['Pars de 0.', 'Ajoute chaque nombre avec une boucle for…of.'],
  testCases: [
    { arguments: [[1, 2, 3]], expectedResult: 6, isHidden: false, description: 'cas simple' },
    { arguments: [[]], expectedResult: 0, isHidden: true, description: 'tableau vide' },
  ],
}

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
let generate: ReturnType<typeof vi.fn<ExerciseGenerator['generate']>>

const serviceWith = (
  execute: (code: string) => Promise<ExecutionResult> = runInNode,
  generator: ExerciseGenerator | null = { generate },
) =>
  new ExerciseGenerationService(
    repository,
    new AdminContentService(repository, () => NOW, execute),
    generator,
  )

beforeEach(() => {
  repository = new InMemoryAdminContentRepository(
    [track(1, 'javascript', 1), track(3, 'conception', 3, { programmingLanguage: null })],
    [
      chapter(JS_CHAPTER, 1, 'boucles', 'beginner', 1, {
        title: 'Les boucles',
        summary: 'for, while, for…of',
      }),
      chapter(NO_LANGUAGE_CHAPTER, 3, 'principes', 'beginner', 1),
    ],
    [],
    [exercise(100, JS_CHAPTER, 'deja-la', 1)],
    [],
  )
  generate = vi.fn<ExerciseGenerator['generate']>().mockResolvedValue(AI_EXERCISE)
})

describe('ExerciseGenerationService : brouillon généré par l’IA', () => {
  it('crée un brouillon marqué « généré par IA », jamais publié', async () => {
    const { exercise: draft } = saved(
      await serviceWith().generate(JS_CHAPTER, { topic: 'somme avec une boucle' }),
    )

    expect(draft).toMatchObject({
      chapterId: JS_CHAPTER,
      slug: 'somme-tableau',
      functionName: 'somme',
      generatedByAi: true,
      status: 'draft',
      firstPublishedAt: null,
      position: 2,
    })
    expect(draft.testCases.map((t) => [t.position, t.isHidden])).toEqual([
      [1, false],
      [2, true],
    ])
    expect(await repository.findExercise(draft.id)).toMatchObject({ generatedByAi: true })
  })

  it('donne à l’IA le sujet, le niveau du chapitre, le langage et les slugs déjà pris', async () => {
    await serviceWith().generate(JS_CHAPTER, { topic: 'somme avec une boucle' })

    expect(generate).toHaveBeenCalledWith({
      topic: 'somme avec une boucle',
      level: 'beginner',
      language: 'javascript',
      chapterTitle: 'Les boucles',
      chapterSummary: 'for, while, for…of',
      takenSlugs: ['deja-la'],
    })
  })

  it('le niveau demandé remplace celui du chapitre', async () => {
    await serviceWith().generate(JS_CHAPTER, { topic: 'récursion', level: 'advanced' })

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ level: 'advanced' }))
  })

  it('vérifie aussitôt la solution de l’IA avec le moteur', async () => {
    const draft = saved(await serviceWith().generate(JS_CHAPTER, { topic: 'somme' }))

    expect(draft.solutionCheck).toMatchObject({ passed: true, stderr: '' })
    expect(draft.solutionCheck!.checks.length).toBeGreaterThan(0)
    expect(draft.exercise).toMatchObject({ solutionCheckStatus: 'passed', solutionCheckedAt: NOW })
  })

  it('garde le brouillon quand la solution de l’IA est fausse : l’admin la corrige', async () => {
    generate.mockResolvedValue({ ...AI_EXERCISE, solutionCode: 'function somme() { return 1 }' })

    const draft = saved(await serviceWith().generate(JS_CHAPTER, { topic: 'somme' }))

    expect(draft.solutionCheck).toMatchObject({ passed: false })
    expect(draft.exercise).toMatchObject({ status: 'draft', solutionCheckStatus: 'failed' })
  })

  it('garde le brouillon non vérifié si le moteur est indisponible', async () => {
    const down = async (): Promise<ExecutionResult> => {
      throw new EngineUnavailableError(new Error('ECONNREFUSED'))
    }

    const draft = saved(await serviceWith(down).generate(JS_CHAPTER, { topic: 'somme' }))

    expect(draft.solutionCheck).toBeNull()
    expect(draft.exercise).toMatchObject({ status: 'draft', solutionCheckStatus: 'not_checked' })
  })

  it('suffixe le slug proposé par l’IA s’il est déjà pris dans le chapitre', async () => {
    generate.mockResolvedValue({ ...AI_EXERCISE, slug: 'deja-la' })
    const service = serviceWith()

    const first = saved(await service.generate(JS_CHAPTER, { topic: 'somme' }))
    const second = saved(await service.generate(JS_CHAPTER, { topic: 'somme' }))

    expect([first.exercise.slug, second.exercise.slug]).toEqual(['deja-la-2', 'deja-la-3'])
  })

  it.each([
    ['sans sujet', {}],
    ['un sujet vide', { topic: '   ' }],
    ['un sujet trop long', { topic: 'x'.repeat(501) }],
    ['un niveau inconnu', { topic: 'somme', level: 'expert' }],
    ['un champ inconnu', { topic: 'somme', status: 'published' }],
  ])('refuse %s, sans appeler l’IA', async (_name, body) => {
    expect(await serviceWith().generate(JS_CHAPTER, body)).toMatchObject({ status: 'invalid' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('404 sur un chapitre inconnu, sans appeler l’IA', async () => {
    expect(await serviceWith().generate(999, { topic: 'somme' })).toEqual({ status: 'not-found' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('refuse un chapitre dont le parcours n’a pas de langage, sans appeler l’IA', async () => {
    expect(await serviceWith().generate(NO_LANGUAGE_CHAPTER, { topic: 'x' })).toEqual({
      status: 'no-language',
    })
    expect(generate).not.toHaveBeenCalled()
  })

  it('répond « IA indisponible » quand aucune clé n’est configurée', async () => {
    const service = serviceWith(runInNode, null)

    expect(await service.generate(JS_CHAPTER, { topic: 'somme' })).toEqual({
      status: 'ai-unavailable',
    })
  })

  it('laisse remonter une panne de l’API IA', async () => {
    generate.mockRejectedValue(new AiUnavailableError(new Error('529 overloaded')))

    await expect(serviceWith().generate(JS_CHAPTER, { topic: 'somme' })).rejects.toBeInstanceOf(
      AiUnavailableError,
    )
  })

  it.each([
    ['un refus du modèle', null],
    ['aucun cas de test', { ...AI_EXERCISE, testCases: [] }],
    ['un nom de fonction dangereux', { ...AI_EXERCISE, functionName: 'a; evil()' }],
    ['un slug invalide', { ...AI_EXERCISE, slug: 'Pas Un Slug' }],
    ['quatre indices', { ...AI_EXERCISE, hints: ['a', 'b', 'c', 'd'] }],
    ['un champ en trop', { ...AI_EXERCISE, status: 'published' }],
  ])('rejette une sortie de l’IA avec %s, sans rien créer', async (_name, output) => {
    generate.mockResolvedValue(output as GeneratedExercise | null)

    expect(await serviceWith().generate(JS_CHAPTER, { topic: 'somme' })).toEqual({
      status: 'ai-output-invalid',
    })
    expect(await repository.listExercises(JS_CHAPTER)).toHaveLength(1)
  })
})
