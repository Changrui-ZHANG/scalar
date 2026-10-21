import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { PublicExercise, TrackView } from '@scalar/shared/api'
import * as executionsService from '~/services/executions'
import * as tracksService from '~/services/tracks'
import { useExerciseRun } from './useExerciseRun'

describe('composables/useExerciseRun', () => {
  const sampleExercise: PublicExercise = {
    slug: 'echanger-valeurs',
    title: 'Échanger deux valeurs',
    number: 1,
    instructions: 'Inversez a et b',
    functionName: 'swap',
    starterCode: 'function swap(a, b) {\n  return [a, b]\n}',
    hints: ['Pensez à un tableau'],
    testCases: [{ arguments: [1, 2], expectedResult: [2, 1], description: null }],
    hiddenTestCaseCount: 0,
    track: { slug: 'javascript', name: 'JavaScript', programmingLanguage: 'javascript' },
    chapter: { slug: 'variables', title: 'Variables', number: 1 },
    next: null,
  }

  const sampleTrack: TrackView = {
    track: { slug: 'javascript', name: 'JavaScript', summary: '', programmingLanguage: 'javascript', prerequisite: null },
    chapters: [
      {
        slug: 'variables',
        title: 'Variables',
        summary: '',
        level: 'beginner',
        number: 1,
        lessons: [],
        exercises: [{ slug: 'echanger-valeurs', title: 'Échanger deux valeurs', instructions: '' }],
      },
    ],
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('initialise le code de départ depuis starterCode', () => {
    const runState = useExerciseRun(sampleExercise, sampleTrack)
    expect(runState.code.value).toBe(sampleExercise.starterCode)
    expect(runState.tab.value).toBe('instructions')
    expect(runState.resultTab.value).toBe('tests')
  })

  it('exécute le code et bascule sur l’onglet console', async () => {
    vi.spyOn(executionsService, 'executeCode').mockResolvedValueOnce({
      status: 'OK',
      label: 'OK',
      run: { stdout: '[2, 1]\n', stderr: '', output: '[2, 1]\n', code: 0, signal: null, wall_time: 15 },
    })

    const runState = useExerciseRun(sampleExercise, sampleTrack)
    await runState.run()

    expect(runState.resultTab.value).toBe('console')
    expect(runState.mobileTab.value).toBe('result')
    expect(runState.execution.value?.run.stdout).toBe('[2, 1]\n')
  })

  it('vérifie le code et bascule sur l’onglet tests', async () => {
    vi.spyOn(tracksService, 'verifyExercise').mockResolvedValueOnce({
      passed: true,
      passedCount: 3,
      total: 3,
      checks: [],
      execution: {
        status: 'OK',
        label: 'OK',
        run: { stdout: '', stderr: '', output: '', code: 0, signal: null, wall_time: 20 },
      },
    })

    const runState = useExerciseRun(sampleExercise, sampleTrack)
    await runState.verify()

    expect(runState.resultTab.value).toBe('tests')
    expect(runState.passed.value).toBe(true)
  })
})
