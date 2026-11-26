import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '../../../../../frontend/app/services/auth'
import * as learnersService from '../../../../../frontend/app/services/learners'
import { useAuthStore } from '../../../../../frontend/app/stores/auth'
import { useProgressStore } from '../../../../../frontend/app/stores/progress'
import { LEARNER_STORAGE_KEY } from '../../../../../frontend/app/utils/storage'

const account = { id: 'a1', email: 'ada@example.com', role: 'learner' as const }
const learnerId = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'
const noProgress = { passedCount: 0, exercises: [], lessons: [] }

describe('stores/auth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('lit la session au chargement', async () => {
    vi.spyOn(authService, 'fetchMe').mockResolvedValueOnce(account)
    vi.spyOn(learnersService, 'fetchLearnerProgress').mockResolvedValueOnce(noProgress)
    const store = useAuthStore()

    await store.loadSession()

    expect(store.loaded).toBe(true)
    expect(store.account).toEqual(account)
  })

  it('reste sans compte quand il n’y a pas de session', async () => {
    vi.spyOn(authService, 'fetchMe').mockRejectedValueOnce({ statusCode: 401 })
    const store = useAuthStore()

    await store.loadSession()

    expect(store.loaded).toBe(true)
    expect(store.account).toBeNull()
  })

  it('garde le compte après connexion et l’oublie après déconnexion', async () => {
    vi.spyOn(authService, 'login').mockResolvedValueOnce(account)
    vi.spyOn(authService, 'logout').mockResolvedValueOnce()
    vi.spyOn(learnersService, 'fetchLearnerProgress').mockResolvedValueOnce(noProgress)
    const store = useAuthStore()

    await store.login({ email: 'ada@example.com', password: 'motdepasse' })
    expect(store.account).toEqual(account)

    await store.logout()
    expect(store.account).toBeNull()
  })

  it('ne garde pas de compte quand la connexion est refusée', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce({ statusCode: 401 })
    const store = useAuthStore()

    await expect(store.login({ email: 'ada@example.com', password: 'faux' })).rejects.toBeTruthy()
    expect(store.account).toBeNull()
  })

  it('crée un apprenant anonyme à la première vérification, puis le réutilise', async () => {
    const create = vi.spyOn(learnersService, 'createLearner').mockResolvedValueOnce(learnerId)
    const store = useAuthStore()

    expect(await store.learnerHeaders()).toEqual({ 'X-Learner-Id': learnerId })
    expect(await store.learnerHeaders()).toEqual({ 'X-Learner-Id': learnerId })
    expect(create).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(LEARNER_STORAGE_KEY)).toBe(learnerId)
  })

  it('n’envoie aucun identifiant quand le visiteur est connecté', async () => {
    const create = vi.spyOn(learnersService, 'createLearner')
    const store = useAuthStore()
    store.account = account

    expect(await store.learnerHeaders()).toEqual({})
    expect(create).not.toHaveBeenCalled()
  })

  it('fait reprendre l’apprenant anonyme par le compte à l’inscription', async () => {
    localStorage.setItem(LEARNER_STORAGE_KEY, learnerId)
    const register = vi.spyOn(authService, 'register').mockResolvedValueOnce(account)
    vi.spyOn(learnersService, 'fetchLearnerProgress').mockResolvedValueOnce(noProgress)
    const store = useAuthStore()

    await store.register({ email: 'ada@example.com', password: 'motdepasse' })

    expect(register).toHaveBeenCalledWith(
      { email: 'ada@example.com', password: 'motdepasse' },
      learnerId,
    )
    expect(localStorage.getItem(LEARNER_STORAGE_KEY)).toBeNull()
  })

  it('ajoute à la progression les exercices réussis et les leçons terminées du compte', async () => {
    vi.spyOn(authService, 'fetchMe').mockResolvedValueOnce(account)
    vi.spyOn(learnersService, 'fetchLearnerProgress').mockResolvedValueOnce({
      passedCount: 1,
      exercises: [
        {
          track: 'javascript',
          chapter: 'variables',
          exercise: 'swap',
          title: 'Échanger',
          attempts: 2,
          passed: true,
          firstPassedAt: '2026-11-20T10:00:00Z',
          lastAttemptAt: '2026-11-20T10:00:00Z',
        },
        {
          track: 'javascript',
          chapter: 'variables',
          exercise: 'aire',
          title: 'Aire',
          attempts: 1,
          passed: false,
          firstPassedAt: null,
          lastAttemptAt: '2026-11-20T10:05:00Z',
        },
      ],
      lessons: [
        {
          track: 'javascript',
          chapter: 'variables',
          lesson: 'let-const',
          title: 'let et const',
          completedAt: '2026-11-19T09:00:00Z',
        },
      ],
    })
    const store = useAuthStore()

    await store.loadSession()

    const done = useProgressStore().completedFor('javascript')
    expect(done.has('exercise:variables:swap')).toBe(true)
    expect(done.has('exercise:variables:aire')).toBe(false)
    expect(done.has('lesson:variables:let-const')).toBe(true)
  })

  it('envoie l’apprenant anonyme à la connexion pour fusionner sa progression', async () => {
    localStorage.setItem(LEARNER_STORAGE_KEY, learnerId)
    const login = vi.spyOn(authService, 'login').mockResolvedValueOnce(account)
    vi.spyOn(learnersService, 'fetchLearnerProgress').mockResolvedValueOnce(noProgress)
    const store = useAuthStore()

    await store.login({ email: 'ada@example.com', password: 'motdepasse' })

    expect(login).toHaveBeenCalledWith(
      { email: 'ada@example.com', password: 'motdepasse' },
      learnerId,
    )
    expect(localStorage.getItem(LEARNER_STORAGE_KEY)).toBeNull()
  })
})
