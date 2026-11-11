import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CodeField from '../app/components/CodeField.vue'
import { useRoutePreviewExercise } from '../app/composables/useRouteRecord'
import TracksPage from '../app/pages/parcours/index.vue'
import TrackPage from '../app/pages/parcours/[trackId]/index.vue'
import DemoPage from '../app/pages/parcours/[trackId]/demo.vue'
import PreviewPage from '../app/pages/parcours/[trackId]/apercu/index.vue'
import ExercisePreviewPage from '../app/pages/parcours/[trackId]/apercu/exercices/[exerciseId].vue'
import type { Chapter, Exercise, Track } from '../app/utils/content'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const TRACK: Track = {
  id: 1,
  slug: 'javascript',
  position: 1,
  name: 'JavaScript',
  summary: 'Le langage.',
  programmingLanguage: 'javascript',
  status: 'published',
}

const chapter = (id: number, title: string, status: Chapter['status']): Chapter => ({
  id,
  trackId: 1,
  slug: `chapitre-${id}`,
  level: 'beginner',
  position: id,
  title,
  summary: '',
  status,
})

const exercise = (id: number, chapterId: number, overrides: Partial<Exercise> = {}): Exercise => ({
  id,
  chapterId,
  slug: `exercice-${id}`,
  position: id,
  title: `Exercice ${id}`,
  instructions: `Consigne de l’exercice ${id}.`,
  functionName: 'f',
  starterCode: `function f() { /* départ ${id} */ }`,
  solutionCode: 'function f() { return 1 }',
  hints: [],
  testCases: [],
  solutionCheckStatus: 'passed',
  status: 'published',
  ...overrides,
})

const FIRST = exercise(3, 2, { hints: ['Premier indice', 'Second indice'] })
const MIDDLE = exercise(4, 2, { status: 'draft', title: 'Exercice brouillon' })
const LAST = exercise(5, 6)

const VERDICT = {
  passed: false,
  passedCount: 2,
  total: 3,
  checks: [
    { label: 'Le programme s’exécute', passed: true, detail: null },
    { label: 'f() renvoie 1', passed: false, detail: 'Obtenu : 2' },
  ],
  execution: {
    status: 'OK',
    label: 'Exécution réussie',
    run: { stdout: 'trace de console.log\n', stderr: '' },
  },
}

beforeEach(() => {
  apiMock.mockReset()
  const data: Record<string, unknown> = {
    '/auth/me': { id: 'a', email: 'admin@scalar.test', role: 'admin' },
    '/admin/tracks': [TRACK],
    '/admin/tracks/1': TRACK,
    '/admin/tracks/1/chapters': [
      chapter(2, 'Les bases', 'published'),
      chapter(6, 'Chapitre en cours', 'draft'),
    ],
    '/admin/chapters/2/exercises': [FIRST, MIDDLE],
    '/admin/chapters/6/exercises': [LAST],
    '/admin/exercises/3/verifications': VERDICT,
  }
  apiMock.mockImplementation(async (path: string) =>
    path in data
      ? { ok: true, data: data[path] }
      : { ok: false, status: 404, message: 'Introuvable.' },
  )
})

// Le prefixe `/admin` (baseURL) n'est pas l'objet de ces tests.
const hrefs = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper.findAll('a').map((a) => a.attributes('href')?.replace(/^\/admin/, ''))

describe('page d’un parcours', () => {
  it('mène à l’aperçu pour tester le parcours', async () => {
    const wrapper = await mountSuspended(TrackPage, { route: '/parcours/1' })

    expect(wrapper.text()).toContain('Tester le parcours')
    expect(hrefs(wrapper)).toContain('/parcours/1/apercu')
  })
})

describe('DEMO depuis la liste des parcours', () => {
  it('propose DEMO sur chaque parcours', async () => {
    const wrapper = await mountSuspended(TracksPage, { route: '/parcours' })

    expect(wrapper.text()).toContain('DEMO')
    expect(hrefs(wrapper)).toContain('/parcours/1/demo')
  })

  it('ouvre le premier exercice du parcours en DEMO', async () => {
    await mountSuspended(DemoPage, { route: '/parcours/1/demo' })

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.fullPath).toBe('/parcours/1/apercu/exercices/3?demo=1'),
    )
  })
})

describe('aperçu d’un parcours', () => {
  it('liste les chapitres et leurs exercices, brouillons compris et signalés', async () => {
    const wrapper = await mountSuspended(PreviewPage, { route: '/parcours/1/apercu' })

    expect(wrapper.text()).toContain('Les bases')
    expect(wrapper.text()).toContain('Chapitre en cours')
    expect(wrapper.text()).toContain('Exercice brouillon')
    expect(wrapper.text()).toContain('Brouillon')
    expect(hrefs(wrapper)).toEqual(
      expect.arrayContaining([
        '/parcours/1/apercu/exercices/3',
        '/parcours/1/apercu/exercices/4',
        '/parcours/1/apercu/exercices/5',
      ]),
    )
  })
})

describe('essai d’un exercice', () => {
  const mountExercise = (id: number) =>
    mountSuspended(ExercisePreviewPage, { route: `/parcours/1/apercu/exercices/${id}` })

  async function click(wrapper: Awaited<ReturnType<typeof mountExercise>>, label: string) {
    const button = wrapper.findAll('button').find((b) => b.text().includes(label))
    await button!.trigger('click')
    await flushPromises()
  }

  it('montre la consigne et part du code de départ', async () => {
    const wrapper = await mountExercise(3)

    expect(wrapper.text()).toContain('Consigne de l’exercice 3.')
    expect(wrapper.findComponent(CodeField).props('modelValue')).toBe(FIRST.starterCode)
  })

  it('exécute le code de l’éditeur et affiche le verdict et la console', async () => {
    const wrapper = await mountExercise(3)
    wrapper.findComponent(CodeField).vm.$emit('update:modelValue', 'function f() { return 2 }')
    await flushPromises()

    await click(wrapper, 'Exécuter')

    expect(apiMock).toHaveBeenCalledWith('/admin/exercises/3/verifications', {
      method: 'POST',
      body: { code: 'function f() { return 2 }' },
    })
    expect(wrapper.text()).toContain('f() renvoie 1')
    expect(wrapper.text()).toContain('Obtenu : 2')
    expect(wrapper.text()).toContain('trace de console.log')
  })

  it('sans DEMO : pas de solution dans l’éditeur, pas de bouton DEMO', async () => {
    const wrapper = await mountExercise(3)

    expect(wrapper.findComponent(CodeField).props('modelValue')).toBe(FIRST.starterCode)
    expect(wrapper.text()).not.toContain('DEMO')
  })

  const mountDemo = (id: number) =>
    mountSuspended(ExercisePreviewPage, { route: `/parcours/1/apercu/exercices/${id}?demo=1` })

  it('en DEMO : part du code de départ et n’exécute rien tout seul', async () => {
    const wrapper = await mountDemo(3)
    await flushPromises()

    expect(wrapper.findComponent(CodeField).props('modelValue')).toBe(FIRST.starterCode)
    expect(apiMock).not.toHaveBeenCalledWith('/admin/exercises/3/verifications', expect.anything())
  })

  it('en DEMO : « Réponse » met la solution dans l’éditeur, sans l’exécuter', async () => {
    const wrapper = await mountDemo(3)

    await click(wrapper, 'Réponse')

    expect(wrapper.findComponent(CodeField).props('modelValue')).toBe(FIRST.solutionCode)
    expect(apiMock).not.toHaveBeenCalledWith('/admin/exercises/3/verifications', expect.anything())
  })

  it('en DEMO : « Modifier » ouvre l’édition en gardant le chemin du retour', async () => {
    const wrapper = await mountDemo(4)

    expect(hrefs(wrapper)).toContain('/parcours/1/chapitres/2/exercices/4?demo=1')
  })

  it('hors DEMO : pas de bouton Réponse', async () => {
    const wrapper = await mountExercise(3)

    expect(wrapper.text()).not.toContain('Réponse')
  })

  it('en DEMO : on reste en DEMO d’un exercice à l’autre, jusqu’à la fin du parcours', async () => {
    const middle = await mountSuspended(ExercisePreviewPage, {
      route: '/parcours/1/apercu/exercices/4?demo=1',
    })
    expect(hrefs(middle)).toEqual(
      expect.arrayContaining([
        '/parcours/1/apercu/exercices/3?demo=1',
        '/parcours/1/apercu/exercices/5?demo=1',
      ]),
    )

    const last = await mountSuspended(ExercisePreviewPage, {
      route: '/parcours/1/apercu/exercices/5?demo=1',
    })
    expect(last.text()).toContain('Fin de la démo')
    expect(hrefs(last)).toContain('/parcours')
  })

  it('dévoile les indices un par un', async () => {
    const wrapper = await mountExercise(3)
    expect(wrapper.text()).not.toContain('Premier indice')

    await click(wrapper, 'Afficher un indice')
    expect(wrapper.text()).toContain('Premier indice')
    expect(wrapper.text()).not.toContain('Second indice')

    await click(wrapper, 'Afficher un indice')
    expect(wrapper.text()).toContain('Second indice')
  })

  it('enchaîne les exercices du parcours, d’un chapitre au suivant', async () => {
    const middle = await mountExercise(4)
    expect(hrefs(middle)).toEqual(
      expect.arrayContaining(['/parcours/1/apercu/exercices/3', '/parcours/1/apercu/exercices/5']),
    )

    const first = await mountExercise(3)
    expect(first.text()).not.toContain('Précédent')
  })

  it('renvoie vers la page d’édition de l’exercice', async () => {
    const wrapper = await mountExercise(4)

    expect(hrefs(wrapper)).toContain('/parcours/1/chapitres/2/exercices/4')
  })

  it('signale un brouillon', async () => {
    const wrapper = await mountExercise(4)

    expect(wrapper.text()).toContain('Brouillon')
  })

  it('404 pour un exercice d’un autre parcours', async () => {
    await useRouter().push('/parcours/1/apercu/exercices/99')

    await expect(useRoutePreviewExercise(TRACK)).rejects.toMatchObject({ statusCode: 404 })
  })
})
