import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ExerciseForm from '../app/components/ExerciseForm.vue'
import { useRouteExercise } from '../app/composables/useRouteRecord'
import NewExercisePage from '../app/pages/parcours/[trackId]/chapitres/[chapterId]/exercices/nouveau.vue'
import EditExercisePage from '../app/pages/parcours/[trackId]/chapitres/[chapterId]/exercices/[exerciseId].vue'
import type { Chapter, Exercise } from '../app/utils/content'
import type { ExerciseInput } from '../app/utils/schemas'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const CHAPTER = { id: 2 } as Chapter
const CHAPTER_URL = '/parcours/1/chapitres/2'
const EXERCISE_URL = `${CHAPTER_URL}/exercices/3`

const EXERCISE: Exercise = {
  id: 3,
  chapterId: 2,
  slug: 'somme',
  position: 1,
  title: 'Somme',
  instructions: 'Additionnez.',
  functionName: 'somme',
  starterCode: 'function somme() {}\n',
  solutionCode: 'function somme() { return 5 }\n',
  hints: [],
  testCases: [{ arguments: [], expectedResult: 5, description: null, isHidden: false }],
  solutionCheckStatus: 'passed',
  status: 'draft',
}

const INPUT: ExerciseInput = {
  title: 'Somme',
  slug: 'somme',
  statement: 'Additionnez.',
  functionName: 'somme',
  starterCode: 'function somme() {}\n',
  solutionCode: 'function somme() { return 5 }\n',
  hints: '',
  testCases: [{ args: '[]', expected: '5', label: '', isHidden: false }],
  status: 'draft',
}

function serve(exercise: Exercise) {
  const data: Record<string, unknown> = {
    '/auth/me': { id: 'a', email: 'admin@scalar.test', role: 'admin' },
    '/admin/tracks/1': {
      id: 1,
      slug: 'javascript',
      position: 1,
      name: 'JavaScript',
      summary: 'Le langage.',
      programmingLanguage: 'javascript',
      status: 'published',
    },
    '/admin/tracks/1/chapters/2': {
      id: 2,
      trackId: 1,
      slug: 'bases',
      level: 'beginner',
      position: 1,
      title: 'Bases',
      summary: 'Les bases.',
      status: 'published',
    },
    '/admin/exercises/3': exercise,
  }
  apiMock.mockImplementation(async (path: string) =>
    path in data
      ? { ok: true, data: data[path] }
      : { ok: false, status: 404, message: 'Introuvable.' },
  )
}

const currentPath = () => useRouter().currentRoute.value.path

beforeEach(() => {
  apiMock.mockReset()
  serve(EXERCISE)
})

describe('page de création d’un exercice', () => {
  const mountPage = () =>
    mountSuspended(NewExercisePage, { route: `${CHAPTER_URL}/exercices/nouveau` })

  it('crée l’exercice dans le chapitre de l’URL', async () => {
    const wrapper = await mountPage()
    apiMock.mockResolvedValue({ ok: true, data: EXERCISE })

    await wrapper.findComponent(ExerciseForm).props('save')(INPUT)

    const [path, options] = apiMock.mock.lastCall as [string, { method: string }]
    expect([options.method, path]).toEqual(['POST', '/admin/chapters/2/exercises'])
  })

  it('ouvre l’exercice créé pour pouvoir le vérifier', async () => {
    const wrapper = await mountPage()

    wrapper.findComponent(ExerciseForm).vm.$emit('saved', EXERCISE)

    await vi.waitFor(() => expect(currentPath()).toBe(EXERCISE_URL))
  })
})

describe('page d’édition d’un exercice', () => {
  const mountPage = () => mountSuspended(EditExercisePage, { route: EXERCISE_URL })

  it('montre la vérification et enregistre sur le bon exercice', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Vérifier la solution')
    expect(wrapper.text()).toContain('Vérifiée')
    apiMock.mockResolvedValue({ ok: true, data: EXERCISE })

    await wrapper.findComponent(ExerciseForm).props('save')(INPUT)

    const [path, options] = apiMock.mock.lastCall as [string, { method: string }]
    expect([options.method, path]).toEqual(['PATCH', '/admin/exercises/3'])
  })

  it('reste sur la page après l’enregistrement et montre le nouveau statut', async () => {
    const wrapper = await mountPage()

    wrapper
      .findComponent(ExerciseForm)
      .vm.$emit('saved', { ...EXERCISE, solutionCheckStatus: 'not_checked' })
    await flushPromises()

    expect(currentPath()).toBe(EXERCISE_URL)
    expect(wrapper.text()).toContain('Non vérifiée')
  })

  it('trouve l’exercice du chapitre de l’URL', async () => {
    await useRouter().push(EXERCISE_URL)

    expect(await useRouteExercise(CHAPTER)).toEqual(EXERCISE)
  })

  it('renvoie 404 pour un exercice d’un autre chapitre', async () => {
    serve({ ...EXERCISE, chapterId: 99 })
    await useRouter().push(EXERCISE_URL)

    await expect(useRouteExercise(CHAPTER)).rejects.toMatchObject({ statusCode: 404 })
  })
})
