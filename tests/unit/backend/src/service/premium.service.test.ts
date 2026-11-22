import { describe, expect, it } from 'vitest'

import { subscription } from '../../../../fixtures/backend/premium.fixtures.ts'
import { InMemorySubscriptionRepository } from '../../../../../backend/src/repository/subscription.repository.ts'
import { InMemoryUserRepository } from '../../../../../backend/src/repository/user.repository.ts'
import { PremiumService } from '../../../../../backend/src/service/premium.service.ts'

const NOW = new Date('2026-11-22T12:00:00Z')
const TOMORROW = new Date('2026-11-23T12:00:00Z')
const YESTERDAY = new Date('2026-11-21T12:00:00Z')

async function setup(freeChapters = 2) {
  const users = new InMemoryUserRepository()
  const subscriptions = new InMemorySubscriptionRepository()
  const service = new PremiumService(users, subscriptions, freeChapters, () => NOW)
  const ada = (await users.create({ email: 'ada@example.com', passwordHash: 'x' }))!
  return { users, subscriptions, service, ada }
}

describe('PremiumService.isPremium', () => {
  it('refuse sans compte, pour un inconnu ou un apprenant anonyme', async () => {
    const { users, service } = await setup()
    const anonymous = await users.createAnonymous()

    expect(await service.isPremium(null)).toBe(false)
    expect(await service.isPremium('00000000-0000-4000-8000-000000000000')).toBe(false)
    expect(await service.isPremium(anonymous.id)).toBe(false)
  })

  it('refuse un compte sans abonnement', async () => {
    const { service, ada } = await setup()

    expect(await service.isPremium(ada.id)).toBe(false)
  })

  it('accepte un abonnement actif dont la période n’est pas finie', async () => {
    const { subscriptions, service, ada } = await setup()
    await subscriptions.save(subscription(ada.id, { currentPeriodEnd: TOMORROW }))

    expect(await service.isPremium(ada.id)).toBe(true)
  })

  it('refuse un abonnement actif dont la période est finie', async () => {
    const { subscriptions, service, ada } = await setup()
    await subscriptions.save(subscription(ada.id, { currentPeriodEnd: YESTERDAY }))

    expect(await service.isPremium(ada.id)).toBe(false)
  })

  it('refuse un abonnement en échec de paiement ou résilié, même en cours de période', async () => {
    const { subscriptions, service, ada } = await setup()

    for (const status of ['past_due', 'canceled'] as const) {
      await subscriptions.save(subscription(ada.id, { status, currentPeriodEnd: TOMORROW }))
      expect(await service.isPremium(ada.id), status).toBe(false)
    }
  })

  it('accepte un admin sans abonnement', async () => {
    const { users, service } = await setup()
    const admin = await users.upsertAdmin({ email: 'admin@example.com', passwordHash: 'x' })

    expect(await service.isPremium(admin.id)).toBe(true)
  })
})

describe('PremiumService.isFreeChapter', () => {
  it('ouvre les chapitres jusqu’au seuil, numéro compris', async () => {
    const { service } = await setup(2)

    expect(service.isFreeChapter(1)).toBe(true)
    expect(service.isFreeChapter(2)).toBe(true)
    expect(service.isFreeChapter(3)).toBe(false)
  })

  it('suit le seuil configuré', async () => {
    const { service } = await setup(1)

    expect(service.isFreeChapter(1)).toBe(true)
    expect(service.isFreeChapter(2)).toBe(false)
  })
})
