/** Comptes et metriques cote backoffice : la forme renvoyee par `/api/v1/admin/users` et `/metrics`. */

export type AccountRole = 'learner' | 'admin'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled'
export type SubscriptionPlan = 'monthly' | 'yearly'
export type SubscriptionFilter = SubscriptionStatus | 'none'

export interface AdminAccount {
  readonly id: string
  readonly email: string
  readonly role: AccountRole
  readonly createdAt: string
  readonly premium: boolean
  readonly subscription: {
    readonly status: SubscriptionStatus
    readonly plan: SubscriptionPlan
    readonly currentPeriodEnd: string
  } | null
}

export interface AccountList {
  readonly total: number
  readonly users: readonly AdminAccount[]
}

export interface Metrics {
  readonly learners: number
  readonly registered: number
  readonly premium: number
  readonly attemptedExercises: number
  readonly passedExercises: number
  readonly certificates: number
  readonly subscriptions: Readonly<Record<SubscriptionStatus, number>>
}

export interface AccountQuery {
  readonly email?: string
  readonly subscription?: SubscriptionFilter
}

export const ROLE_LABELS: Readonly<Record<AccountRole, string>> = {
  learner: 'Apprenant',
  admin: 'Admin',
}

export const SUBSCRIPTION_LABELS: Readonly<Record<SubscriptionStatus, string>> = {
  active: 'Actif',
  past_due: 'Échec de paiement',
  canceled: 'Résilié',
}

export const NO_SUBSCRIPTION_LABEL = 'Jamais abonné'

export const PLAN_LABELS: Readonly<Record<SubscriptionPlan, string>> = {
  monthly: 'Mensuel',
  yearly: 'Annuel',
}

export const SUBSCRIPTION_FILTERS: readonly {
  readonly label: string
  readonly value: SubscriptionFilter | undefined
}[] = [
  { label: 'Tous', value: undefined },
  { label: 'Actifs', value: 'active' },
  { label: 'Échec de paiement', value: 'past_due' },
  { label: 'Résiliés', value: 'canceled' },
  { label: 'Jamais abonnés', value: 'none' },
]

const FILTER_VALUES: readonly string[] = ['active', 'past_due', 'canceled', 'none']

/** Ce que l'adresse de la page demande ; une valeur inconnue est ignoree, pas envoyee a l'API. */
export function toAccountQuery(query: Record<string, unknown>): AccountQuery {
  const email =
    typeof query.email === 'string' && query.email.trim() ? query.email.trim() : undefined
  const subscription =
    typeof query.subscription === 'string' && FILTER_VALUES.includes(query.subscription)
      ? (query.subscription as SubscriptionFilter)
      : undefined
  return { ...(email ? { email } : {}), ...(subscription ? { subscription } : {}) }
}

/** L'email d'abord, puis le filtre : la meme adresse pour la meme recherche. */
export function accountSearch(query: AccountQuery): string {
  const params = new URLSearchParams()
  if (query.email) params.set('email', query.email)
  if (query.subscription) params.set('subscription', query.subscription)
  const search = params.toString()
  return search ? `?${search}` : ''
}

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
