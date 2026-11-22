import type { SubscriptionPlan, SubscriptionStatus, UserRole } from '@scalar/shared/enums'

import type { Subscription } from '../entity/subscription.entity.ts'
import type { CertificateRepository } from '../repository/certificate.repository.ts'
import type { ProgressRepository } from '../repository/progress.repository.ts'
import type { SubscriptionRepository } from '../repository/subscription.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'
import { opensPremium } from './premium.service.ts'

// Assez pour la soutenance sans pagination ; au-dela, la recherche par email resserre la liste.
export const ADMIN_USERS_LIMIT = 100

export type SubscriptionFilter = SubscriptionStatus | 'none'

export interface UserFilter {
  readonly email?: string
  readonly subscription?: SubscriptionFilter
}

export interface AccountView {
  readonly id: string
  readonly email: string
  readonly role: UserRole
  readonly createdAt: Date
  readonly premium: boolean
  readonly subscription: {
    readonly status: SubscriptionStatus
    readonly plan: SubscriptionPlan
    readonly currentPeriodEnd: Date
  } | null
}

export interface Metrics {
  /** Role `learner`, anonymes compris. */
  readonly learners: number
  readonly registered: number
  readonly premium: number
  readonly attemptedExercises: number
  readonly passedExercises: number
  readonly certificates: number
  /** Selon le statut enregistre, periode finie ou non. */
  readonly subscriptions: Readonly<Record<SubscriptionStatus, number>>
}

export class AdminUsersService {
  private readonly users: UserRepository
  private readonly subscriptions: SubscriptionRepository
  private readonly progress: ProgressRepository
  private readonly certificates: CertificateRepository
  private readonly now: () => Date

  constructor(
    users: UserRepository,
    subscriptions: SubscriptionRepository,
    progress: ProgressRepository,
    certificates: CertificateRepository,
    now: () => Date = () => new Date(),
  ) {
    this.users = users
    this.subscriptions = subscriptions
    this.progress = progress
    this.certificates = certificates
    this.now = now
  }

  async listUsers(filter: UserFilter): Promise<{
    readonly total: number
    readonly users: readonly AccountView[]
  }> {
    const email = filter.email?.trim() || undefined
    const [accounts, subscriptions] = await Promise.all([
      this.users.listRegistered(email),
      this.subscriptionsByUser(),
    ])
    const now = this.now()
    const matching = accounts.filter((u) => {
      const status = subscriptions.get(u.id)?.status ?? 'none'
      return filter.subscription === undefined || filter.subscription === status
    })
    return {
      total: matching.length,
      users: matching.slice(0, ADMIN_USERS_LIMIT).map((u) => {
        const subscription = subscriptions.get(u.id) ?? null
        return {
          id: u.id,
          email: u.email!,
          role: u.role,
          createdAt: u.createdAt,
          premium: opensPremium(u.role, subscription, now),
          subscription: subscription && {
            status: subscription.status,
            plan: subscription.plan,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
        }
      }),
    }
  }

  async metrics(): Promise<Metrics> {
    const [learners, subscriptions, attempts, certificates] = await Promise.all([
      this.users.countLearners(),
      this.subscriptions.listAll(),
      this.progress.countAttempts(),
      this.certificates.countCertificates(),
    ])
    const now = this.now()
    const byStatus = { active: 0, past_due: 0, canceled: 0 }
    for (const s of subscriptions) {
      byStatus[s.status] += 1
    }
    return {
      learners: learners.anonymous + learners.registered,
      registered: learners.registered,
      premium: subscriptions.filter((s) => opensPremium('learner', s, now)).length,
      attemptedExercises: attempts.attempted,
      passedExercises: attempts.passed,
      certificates,
      subscriptions: byStatus,
    }
  }

  private async subscriptionsByUser(): Promise<ReadonlyMap<string, Subscription>> {
    return new Map((await this.subscriptions.listAll()).map((s) => [s.userId, s]))
  }
}
