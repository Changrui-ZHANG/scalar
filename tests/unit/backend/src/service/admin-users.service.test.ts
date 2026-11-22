import { describe, expect, it } from 'vitest'

import { PAST, subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { InMemoryCertificateRepository } from '../../../../../backend/src/repository/certificate.repository.ts'
import { InMemoryProgressRepository } from '../../../../../backend/src/repository/progress.repository.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'
import {
  ADMIN_USERS_LIMIT,
  AdminUsersService,
} from '../../../../../backend/src/service/admin-users.service.ts'

async function setup() {
  const users = new InMemoryUserRepository()
  const subscriptions = new InMemorySubscriptionRepository()
  const progress = new InMemoryProgressRepository()
  const certificates = new InMemoryCertificateRepository()
  const service = new AdminUsersService(users, subscriptions, progress, certificates)
  return { users, subscriptions, progress, certificates, service }
}

const register = async (users: InMemoryUserRepository, email: string) =>
  (await users.create({ email, passwordHash: 'x' }))!

describe('AdminUsersService.listUsers', () => {
  it('liste les comptes inscrits, du plus récent au plus ancien, sans les anonymes', async () => {
    const { users, service } = await setup()
    await users.createAnonymous()
    const ada = await register(users, 'ada@example.com')
    await new Promise((resolve) => setTimeout(resolve, 5))
    const eve = await register(users, 'eve@example.com')

    const { total, users: rows } = await service.listUsers({})

    expect(total).toBe(2)
    expect(rows.map((u) => u.id)).toEqual([eve.id, ada.id])
    expect(rows[0]).toEqual({
      id: eve.id,
      email: 'eve@example.com',
      role: 'learner',
      createdAt: eve.createdAt,
      premium: false,
      subscription: null,
    })
  })

  it('décrit l’abonnement de chaque compte et dit s’il ouvre le Premium', async () => {
    const { users, subscriptions, service } = await setup()
    const ada = await register(users, 'ada@example.com')
    const eve = await register(users, 'eve@example.com')
    await subscriptions.save(subscription(ada.id, { plan: 'yearly' }))
    await subscriptions.save(subscription(eve.id, { currentPeriodEnd: PAST }))

    const rows = (await service.listUsers({})).users
    const byEmail = new Map(rows.map((u) => [u.email, u]))

    expect(byEmail.get('ada@example.com')).toMatchObject({
      premium: true,
      subscription: {
        status: 'active',
        plan: 'yearly',
        currentPeriodEnd: subscription(ada.id).currentPeriodEnd,
      },
    })
    expect(byEmail.get('eve@example.com')?.premium).toBe(false)
  })

  it('compte un admin comme Premium, sans abonnement', async () => {
    const { users, service } = await setup()
    await users.upsertAdmin({ email: 'admin@example.com', passwordHash: 'x' })

    expect((await service.listUsers({})).users[0]).toMatchObject({ role: 'admin', premium: true })
  })

  it('cherche par morceau d’email, sans tenir compte de la casse', async () => {
    const { users, service } = await setup()
    await register(users, 'ada.lovelace@example.com')
    await register(users, 'eve@example.org')

    expect((await service.listUsers({ email: 'LOVE' })).users.map((u) => u.email)).toEqual([
      'ada.lovelace@example.com',
    ])
    expect((await service.listUsers({ email: '  ' })).total).toBe(2)
  })

  it('filtre par état de l’abonnement, ou sans abonnement', async () => {
    const { users, subscriptions, service } = await setup()
    const ada = await register(users, 'ada@example.com')
    const bob = await register(users, 'bob@example.com')
    const eve = await register(users, 'eve@example.com')
    await register(users, 'zoe@example.com')
    await subscriptions.save(subscription(ada.id))
    await subscriptions.save(subscription(bob.id, { status: 'past_due' }))
    await subscriptions.save(subscription(eve.id, { status: 'canceled' }))

    const emails = async (filter: Parameters<typeof service.listUsers>[0]) =>
      (await service.listUsers(filter)).users.map((u) => u.email)

    expect(await emails({ subscription: 'active' })).toEqual(['ada@example.com'])
    expect(await emails({ subscription: 'past_due' })).toEqual(['bob@example.com'])
    expect(await emails({ subscription: 'canceled' })).toEqual(['eve@example.com'])
    expect(await emails({ subscription: 'none' })).toEqual(['zoe@example.com'])
    expect(await emails({ subscription: 'active', email: 'eve' })).toEqual([])
  })

  it(`renvoie ${ADMIN_USERS_LIMIT} comptes au plus, avec le total`, async () => {
    const { users, service } = await setup()
    for (let i = 0; i < ADMIN_USERS_LIMIT + 3; i += 1) {
      await register(users, `u${i}@example.com`)
    }

    const { total, users: rows } = await service.listUsers({})

    expect(total).toBe(ADMIN_USERS_LIMIT + 3)
    expect(rows).toHaveLength(ADMIN_USERS_LIMIT)
  })
})

describe('AdminUsersService.metrics', () => {
  it('compte tout à zéro sur une base vide', async () => {
    const { service } = await setup()

    expect(await service.metrics()).toEqual({
      learners: 0,
      registered: 0,
      premium: 0,
      attemptedExercises: 0,
      passedExercises: 0,
      certificates: 0,
      subscriptions: { active: 0, past_due: 0, canceled: 0 },
    })
  })

  it('compte apprenants, inscrits, Premium, exercices, certificats et abonnements', async () => {
    const { users, subscriptions, progress, certificates, service } = await setup()
    const anonymous = await users.createAnonymous()
    const ada = await register(users, 'ada@example.com')
    const bob = await register(users, 'bob@example.com')
    const eve = await register(users, 'eve@example.com')
    await users.upsertAdmin({ email: 'admin@example.com', passwordHash: 'x' })
    await subscriptions.save(subscription(ada.id))
    await subscriptions.save(subscription(bob.id, { currentPeriodEnd: PAST }))
    await subscriptions.save(subscription(eve.id, { status: 'past_due' }))
    const at = new Date()
    await progress.recordAttempt(anonymous.id, 1, false, at)
    await progress.recordAttempt(ada.id, 1, true, at)
    await progress.recordAttempt(ada.id, 2, true, at)
    await progress.recordAttempt(ada.id, 2, false, at)
    await certificates.issue({
      code: 'AAAAA-AAAAA',
      userId: ada.id,
      trackId: 1,
      holderName: 'Ada',
      issuedAt: at,
    })

    expect(await service.metrics()).toEqual({
      // Les admins ne sont pas des apprenants ; un anonyme, si.
      learners: 4,
      registered: 3,
      // Celui de Bob est actif en base, mais sa période est finie.
      premium: 1,
      attemptedExercises: 3,
      passedExercises: 2,
      certificates: 1,
      subscriptions: { active: 2, past_due: 1, canceled: 0 },
    })
  })
})
