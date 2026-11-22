import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UsersPage from '../../../../../../admin/app/pages/utilisateurs/index.vue'

const apiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => () => apiMock)

const ADA = {
  id: 'ada',
  email: 'ada@example.com',
  role: 'learner',
  createdAt: '2026-11-20T09:00:00.000Z',
  premium: true,
  subscription: { status: 'active', plan: 'yearly', currentPeriodEnd: '2027-11-20T09:00:00.000Z' },
}
const EVE = {
  id: 'eve',
  email: 'eve@example.com',
  role: 'learner',
  createdAt: '2026-11-21T09:00:00.000Z',
  premium: false,
  subscription: {
    status: 'past_due',
    plan: 'monthly',
    currentPeriodEnd: '2026-12-21T09:00:00.000Z',
  },
}
const ADMIN = {
  id: 'admin',
  email: 'admin@example.com',
  role: 'admin',
  createdAt: '2026-11-01T09:00:00.000Z',
  premium: true,
  subscription: null,
}

beforeEach(() => {
  apiMock.mockReset()
  apiMock.mockImplementation(async (path: string) =>
    path.startsWith('/admin/users')
      ? { ok: true, data: { total: 3, users: [EVE, ADA, ADMIN] } }
      : path === '/auth/me'
        ? { ok: true, data: { id: 'a', email: 'admin@scalar.test', role: 'admin' } }
        : { ok: false, status: 404, message: 'Introuvable.' },
  )
})

const rowOf = (wrapper: Awaited<ReturnType<typeof mountSuspended>>, email: string) =>
  wrapper
    .findAll('tbody tr')
    .find((tr) => tr.text().includes(email))
    ?.text()

describe('page Utilisateurs', () => {
  it('liste les comptes : rôle, Premium, abonnement et sa formule', async () => {
    const wrapper = await mountSuspended(UsersPage, { route: '/utilisateurs' })

    expect(apiMock).toHaveBeenCalledWith('/admin/users')
    expect(wrapper.text()).toContain('3 comptes')
    expect(rowOf(wrapper, 'ada@example.com')).toMatch(/Apprenant.*Oui.*Actif.*Annuel/)
    expect(rowOf(wrapper, 'eve@example.com')).toMatch(/Non.*Échec de paiement.*Mensuel/)
    expect(rowOf(wrapper, 'admin@example.com')).toMatch(/Admin.*Oui.*Jamais abonné/)
  })

  it('reprend la recherche et le filtre de l’adresse de la page', async () => {
    const wrapper = await mountSuspended(UsersPage, {
      route: '/utilisateurs?email=ada&subscription=active',
    })

    expect(apiMock).toHaveBeenCalledWith('/admin/users?email=ada&subscription=active')
    expect((wrapper.find('input[type="search"]').element as HTMLInputElement).value).toBe('ada')
  })

  it('cherche par email en gardant le filtre choisi', async () => {
    const wrapper = await mountSuspended(UsersPage, {
      route: '/utilisateurs?subscription=canceled',
    })

    await wrapper.find('input[type="search"]').setValue('eve')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.fullPath).toBe(
        '/utilisateurs?email=eve&subscription=canceled',
      ),
    )
    expect(apiMock).toHaveBeenCalledWith('/admin/users?email=eve&subscription=canceled')
  })

  it('propose un lien par filtre d’abonnement, qui garde la recherche', async () => {
    const wrapper = await mountSuspended(UsersPage, { route: '/utilisateurs?email=ada' })
    const href = (label: string) =>
      wrapper
        .findAll('a')
        .find((a) => a.text() === label)
        ?.attributes('href')

    expect(href('Tous')).toBe('/admin/utilisateurs?email=ada')
    expect(href('Actifs')).toBe('/admin/utilisateurs?email=ada&subscription=active')
    expect(href('Échec de paiement')).toBe('/admin/utilisateurs?email=ada&subscription=past_due')
    expect(href('Résiliés')).toBe('/admin/utilisateurs?email=ada&subscription=canceled')
    expect(href('Jamais abonnés')).toBe('/admin/utilisateurs?email=ada&subscription=none')
  })
})
