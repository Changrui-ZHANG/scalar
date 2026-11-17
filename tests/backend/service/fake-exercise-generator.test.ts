import { spawnSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { chapter, track } from '../content.fixtures.ts'
import { InMemoryAdminContentRepository } from '../../../backend/src/repository/admin-content.repository.ts'
import { AdminContentService } from '../../../backend/src/service/admin-content.service.ts'
import { ClaudeExerciseGenerator } from '../../../backend/src/service/claude-exercise-generator.ts'
import type { ExecutionResult } from '../../../backend/src/service/execution.service.ts'
import { createExerciseGenerator } from '../../../backend/src/service/exercise-generator.factory.ts'
import type { ExerciseBrief } from '../../../backend/src/service/exercise-generator.ts'
import { ExerciseGenerationService } from '../../../backend/src/service/exercise-generation.service.ts'
import { FakeExerciseGenerator } from '../../../backend/src/service/fake-exercise-generator.ts'

const BRIEF: ExerciseBrief = {
  topic: 'Somme des nombres pairs',
  level: 'beginner',
  language: 'javascript',
  chapterTitle: 'Les boucles',
  chapterSummary: 'for, while',
  takenSlugs: [],
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

describe('FakeExerciseGenerator', () => {
  const generator = new FakeExerciseGenerator()

  it('reprend le titre demandé et en tire le slug', async () => {
    expect(await generator.generate(BRIEF)).toMatchObject({
      title: 'Somme des nombres pairs',
      slug: 'somme-des-nombres-pairs',
    })
  })

  it('annonce dans la consigne un exemple hors ligne, sans IA', async () => {
    const exercise = await generator.generate(BRIEF)

    expect(exercise!.instructions).toMatch(/exemple/i)
    expect(exercise!.instructions).toContain('ANTHROPIC_API_KEY')
  })

  it('donne un slug valide même pour un titre sans lettre, ou très long', async () => {
    expect((await generator.generate({ ...BRIEF, topic: '???' }))!.slug).toBe('exercice-exemple')
    const long = await generator.generate({ ...BRIEF, topic: 'mot '.repeat(100) })
    expect(long!.slug.length).toBeLessThanOrEqual(60)
    expect(long!.title.length).toBeLessThanOrEqual(120)
  })

  it('écrit du TypeScript pour un parcours TypeScript', async () => {
    const exercise = await generator.generate({ ...BRIEF, language: 'typescript' })

    expect(exercise!.solutionCode).toContain(': number[]')
  })

  it.each(['javascript', 'typescript'] as const)(
    'en %s, donne un brouillon accepté dont la solution passe ses cas',
    async (language) => {
      const repository = new InMemoryAdminContentRepository(
        [track(1, language, 1, { programmingLanguage: language })],
        [chapter(10, 1, 'boucles', 'beginner', 1)],
        [],
        [],
        [],
      )
      const service = new ExerciseGenerationService(
        repository,
        new AdminContentService(repository, () => new Date(), runInNode),
        generator,
      )

      const outcome = await service.generate(10, { topic: 'Somme des nombres pairs' })

      expect(outcome).toMatchObject({
        status: 'saved',
        item: { exercise: { generatedByAi: true }, solutionCheck: { passed: true } },
      })
    },
  )
})

describe('createExerciseGenerator', () => {
  const env = { AI_MODEL: 'claude-opus-5-5', NODE_ENV: 'development' }

  it('appelle Claude quand une clé est configurée', () => {
    expect(createExerciseGenerator({ ...env, ANTHROPIC_API_KEY: 'sk-ant-test' })).toBeInstanceOf(
      ClaudeExerciseGenerator,
    )
  })

  it('sans clé, hors production : le faux générateur, gratuit et hors ligne', () => {
    expect(createExerciseGenerator(env)).toBeInstanceOf(FakeExerciseGenerator)
  })

  it('sans clé, en production : aucun générateur, la route répond 503', () => {
    expect(createExerciseGenerator({ ...env, NODE_ENV: 'production' })).toBeNull()
  })
})
