import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SolutionCheckPanel from '../app/components/SolutionCheckPanel.vue'
import type { Exercise } from '../app/utils/content'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

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

const PASSED: Exercise = { ...EXERCISE, solutionCheckStatus: 'passed' }

const REPORT = {
  exercise: PASSED,
  passed: true,
  checks: [{ label: 'somme(2, 3) renvoie 5', passed: true, detail: 'Reçu : 5' }],
  stderr: 'avertissement du moteur',
}

const mountPanel = () => mountSuspended(SolutionCheckPanel, { props: { exercise: EXERCISE } })

async function clickCheck(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
  const button = wrapper.findAll('button').find((b) => b.text().includes('Vérifier la solution'))
  await button!.trigger('click')
  await flushPromises()
}

beforeEach(() => {
  apiMock.mockReset()
})

describe('SolutionCheckPanel', () => {
  it('affiche le statut de la vérification', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Non vérifiée')
  })

  it('lance la vérification, affiche le rapport et transmet l’exercice à jour', async () => {
    apiMock.mockResolvedValue({ ok: true, data: REPORT })
    const wrapper = await mountPanel()

    await clickCheck(wrapper)

    expect(apiMock).toHaveBeenCalledWith('/admin/exercises/3/solution-check', { method: 'POST' })
    expect(wrapper.text()).toContain('somme(2, 3) renvoie 5')
    expect(wrapper.text()).toContain('Reçu : 5')
    expect(wrapper.text()).toContain('avertissement du moteur')
    expect(wrapper.emitted('checked')).toEqual([[PASSED]])
  })

  it('n’annonce rien de vérifié quand l’API refuse', async () => {
    apiMock.mockResolvedValue({ ok: false, status: 409, message: 'Aucun cas de test.' })
    const wrapper = await mountPanel()

    await clickCheck(wrapper)

    expect(wrapper.emitted('checked')).toBeUndefined()
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('efface un rapport périmé quand le code enregistré a changé', async () => {
    apiMock.mockResolvedValue({ ok: true, data: REPORT })
    const wrapper = await mountPanel()
    await clickCheck(wrapper)
    await wrapper.setProps({ exercise: PASSED })
    expect(wrapper.text()).toContain('somme(2, 3) renvoie 5')

    await wrapper.setProps({ exercise: EXERCISE })

    expect(wrapper.text()).not.toContain('somme(2, 3) renvoie 5')
  })
})
