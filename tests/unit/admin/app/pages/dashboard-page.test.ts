import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DashboardPage from '../../../../../admin/app/pages/index.vue'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const METRICS = {
  learners: 1234,
  registered: 56,
  premium: 7,
  attemptedExercises: 890,
  passedExercises: 610,
  certificates: 3,
  subscriptions: { active: 8, past_due: 2, canceled: 4 },
}

beforeEach(() => {
  apiMock.mockReset()
  apiMock.mockImplementation(async (path: string) =>
    path === '/admin/metrics'
      ? { ok: true, data: METRICS }
      : path === '/auth/me'
        ? { ok: true, data: { id: 'a', email: 'admin@scalar.test', role: 'admin' } }
        : { ok: false, status: 404, message: 'Introuvable.' },
  )
})

describe('tableau de bord', () => {
  it('affiche chaque métrique avec son libellé', async () => {
    const wrapper = await mountSuspended(DashboardPage, { route: '/' })
    const tile = (label: string) =>
      wrapper
        .findAll('[data-metric]')
        .find((t) => t.text().includes(label))
        ?.text()

    expect(apiMock).toHaveBeenCalledWith('/admin/metrics')
    expect(tile('Apprenants')).toContain('1234')
    expect(tile('Inscrits')).toContain('56')
    expect(tile('Premium')).toContain('7')
    expect(tile('Exercices tentés')).toContain('890')
    expect(tile('Exercices réussis')).toContain('610')
    expect(tile('Certificats')).toContain('3')
  })

  it('détaille les abonnements par état, avec un lien vers la liste filtrée', async () => {
    const wrapper = await mountSuspended(DashboardPage, { route: '/' })
    const links = wrapper.findAll('a').map((a) => [a.text(), a.attributes('href')])

    expect(links).toContainEqual([
      expect.stringContaining('Actifs'),
      '/admin/utilisateurs?subscription=active',
    ])
    expect(links).toContainEqual([
      expect.stringContaining('Échec de paiement'),
      '/admin/utilisateurs?subscription=past_due',
    ])
    expect(links).toContainEqual([
      expect.stringContaining('Résiliés'),
      '/admin/utilisateurs?subscription=canceled',
    ])
    expect(wrapper.text()).toMatch(/Actifs\s*8/)
  })
})
