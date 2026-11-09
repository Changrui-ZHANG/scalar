import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ExerciseRowActions from '../app/components/ExerciseRowActions.vue'
import type { Exercise } from '../app/utils/content'

const { apiMock, toastAdd } = vi.hoisted(() => ({ apiMock: vi.fn(), toastAdd: vi.fn() }))

mockNuxtImport('useApi', () => () => apiMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const EXERCISE: Exercise = {
  id: 3,
  chapterId: 2,
  slug: 'somme',
  position: 1,
  title: 'Somme',
  instructions: 'Additionnez.',
  functionName: 'somme',
  starterCode: 'function somme() {}',
  solutionCode: 'function somme() { return 5 }',
  hints: [],
  testCases: [],
  solutionCheckStatus: 'not_checked',
  status: 'draft',
}
const VERIFIED: Exercise = { ...EXERCISE, solutionCheckStatus: 'passed' }
const ONLINE: Exercise = { ...VERIFIED, status: 'published' }

const EDIT_URL = '/parcours/1/chapitres/2/exercices/3'

const mountActions = (exercise: Exercise) =>
  mountSuspended(ExerciseRowActions, { props: { exercise, editTo: EDIT_URL } })

type Wrapper = Awaited<ReturnType<typeof mountActions>>

const button = (wrapper: Wrapper, label: string) =>
  wrapper.findAll('button').find((b) => b.text() === label)

async function click(wrapper: Wrapper, label: string) {
  await button(wrapper, label)!.trigger('click')
  await flushPromises()
}

beforeEach(() => {
  apiMock.mockReset()
  toastAdd.mockReset()
})

describe('actions d’un exercice dans la liste', () => {
  it('mène à la page de modification', async () => {
    const wrapper = await mountActions(EXERCISE)

    expect(wrapper.find('a').attributes('href')).toContain(EDIT_URL)
    expect(wrapper.find('a').text()).toBe('Modifier')
  })

  it('vérifie la solution et transmet l’exercice à jour', async () => {
    apiMock.mockResolvedValue({
      ok: true,
      data: { exercise: VERIFIED, passed: true, checks: [], stderr: '' },
    })
    const wrapper = await mountActions(EXERCISE)

    await click(wrapper, 'Vérifier')

    expect(apiMock).toHaveBeenCalledWith('/admin/exercises/3/solution-check', { method: 'POST' })
    expect(wrapper.emitted('updated')).toEqual([[VERIFIED]])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('signale une solution qui échoue', async () => {
    const failed: Exercise = { ...EXERCISE, solutionCheckStatus: 'failed' }
    apiMock.mockResolvedValue({
      ok: true,
      data: { exercise: failed, passed: false, checks: [], stderr: '' },
    })
    const wrapper = await mountActions(EXERCISE)

    await click(wrapper, 'Vérifier')

    expect(wrapper.emitted('updated')).toEqual([[failed]])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it.each(['not_checked', 'failed'] as const)(
    'empêche de publier une solution au statut %s',
    async (solutionCheckStatus) => {
      const wrapper = await mountActions({ ...EXERCISE, solutionCheckStatus })

      expect(button(wrapper, 'Publier')!.attributes('disabled')).toBeDefined()
    },
  )

  it('publie un exercice vérifié', async () => {
    apiMock.mockResolvedValue({ ok: true, data: ONLINE })
    const wrapper = await mountActions(VERIFIED)

    await click(wrapper, 'Publier')

    expect(apiMock).toHaveBeenCalledWith('/admin/exercises/3', {
      method: 'PATCH',
      body: { status: 'published' },
    })
    expect(wrapper.emitted('updated')).toEqual([[ONLINE]])
  })

  it('dépublie un exercice en ligne', async () => {
    apiMock.mockResolvedValue({ ok: true, data: VERIFIED })
    const wrapper = await mountActions(ONLINE)

    await click(wrapper, 'Dépublier')

    expect(apiMock).toHaveBeenCalledWith('/admin/exercises/3', {
      method: 'PATCH',
      body: { status: 'draft' },
    })
    expect(wrapper.emitted('updated')).toEqual([[VERIFIED]])
  })

  it('affiche le refus de l’API sans rien changer', async () => {
    const message = 'Publication refusée : la solution doit d’abord réussir la vérification.'
    apiMock.mockResolvedValue({ ok: false, status: 409, message })
    const wrapper = await mountActions(VERIFIED)

    await click(wrapper, 'Publier')

    expect(wrapper.emitted('updated')).toBeUndefined()
    expect(toastAdd).toHaveBeenCalledWith({ title: message, color: 'error' })
  })
})
