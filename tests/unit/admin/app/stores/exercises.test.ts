import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContentStore } from '../../../../../admin/app/stores/content'
import type { ExerciseInput } from '../../../../../admin/app/utils/schemas'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const INPUT: ExerciseInput = {
  title: 'Somme',
  slug: 'somme',
  statement: 'Additionnez.',
  functionName: 'somme',
  starterCode: 'function somme(a, b) {}\n',
  solutionCode: 'function somme(a, b) { return a + b }\n',
  hints: 'Utilisez +',
  testCases: [{ args: '[2,3]', expected: '5', label: '', isHidden: false }],
  status: 'published',
}

const lastCall = () => {
  const [path, options] = apiMock.mock.lastCall as [
    string,
    { method?: string; body?: Record<string, unknown> } | undefined,
  ]
  return { path, method: options?.method, body: options?.body }
}

beforeEach(() => {
  apiMock.mockReset()
})

describe('store des exercices', () => {
  it('crée sous le chapitre, sans statut : l’API refuse ce champ à la création', async () => {
    apiMock.mockResolvedValue({ ok: true, data: { id: 3 } })

    const result = await useContentStore().createExercise(7, INPUT)

    expect(result).toEqual({ ok: true, item: { id: 3 } })
    const { path, method, body } = lastCall()
    expect([method, path]).toEqual(['POST', '/admin/chapters/7/exercises'])
    expect(body).toMatchObject({ instructions: 'Additionnez.', hints: ['Utilisez +'] })
    expect(body).not.toHaveProperty('status')
  })

  it('envoie les cas de test et le statut à la modification', async () => {
    apiMock.mockResolvedValue({ ok: true, data: { id: 3 } })

    await useContentStore().updateExercise(3, INPUT)

    const { path, method, body } = lastCall()
    expect([method, path]).toEqual(['PATCH', '/admin/exercises/3'])
    expect(body).toMatchObject({
      status: 'published',
      testCases: [{ arguments: [2, 3], expectedResult: 5 }],
    })
  })

  it('remonte le refus 409 d’un exercice publié', async () => {
    const message = 'Exercice publié : repassez-le en brouillon.'
    apiMock.mockResolvedValue({ ok: false, status: 409, message })

    expect(await useContentStore().updateExercise(3, INPUT)).toEqual({
      ok: false,
      field: null,
      message,
    })
  })

  it('demande la vérification de la solution', async () => {
    const report = { passed: true, checks: [], stderr: '', exercise: { id: 3 } }
    apiMock.mockResolvedValue({ ok: true, data: report })

    expect(await useContentStore().checkSolution(3)).toEqual({ ok: true, data: report })
    const { path, method } = lastCall()
    expect([method, path]).toEqual(['POST', '/admin/exercises/3/solution-check'])
  })

  it('change seulement le statut : le code reste intact et vérifié', async () => {
    apiMock.mockResolvedValue({ ok: true, data: { id: 3 } })

    await useContentStore().setExerciseStatus(3, 'published')

    const { path, method, body } = lastCall()
    expect([method, path]).toEqual(['PATCH', '/admin/exercises/3'])
    expect(body).toEqual({ status: 'published' })
  })

  it('demande à l’IA un brouillon à partir du titre, sous le chapitre', async () => {
    const draft = { exercise: { id: 3 }, solutionCheck: null }
    apiMock.mockResolvedValue({ ok: true, data: draft })

    expect(await useContentStore().generateExercise(7, 'Somme d’un tableau')).toEqual({
      ok: true,
      data: draft,
    })
    const { path, method, body } = lastCall()
    expect([method, path]).toEqual(['POST', '/admin/chapters/7/exercises/generate'])
    expect(body).toEqual({ topic: 'Somme d’un tableau' })
  })

  it('remonte le refus de l’IA indisponible', async () => {
    const message = 'L’IA est momentanément indisponible.'
    apiMock.mockResolvedValue({ ok: false, status: 503, message })

    expect(await useContentStore().generateExercise(7, 'Somme')).toEqual({
      ok: false,
      status: 503,
      message,
    })
  })

  it('renvoie null pour un exercice inconnu', async () => {
    apiMock.mockResolvedValue({ ok: false, status: 404, message: 'Exercice introuvable.' })

    expect(await useContentStore().findExercise(3)).toBeNull()
    expect(lastCall().path).toBe('/admin/exercises/3')
  })
})
