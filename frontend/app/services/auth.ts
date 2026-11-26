import type { Account, Credentials } from '~/types/account'
import { apiFetch } from './api'

// Le backend pose et efface lui-même le cookie de session (httpOnly) :
// le site n'a jamais le jeton entre les mains.

export function fetchMe(): Promise<Account> {
  return apiFetch<Account>('/auth/me')
}

export function login(credentials: Credentials): Promise<Account> {
  return apiFetch<Account>('/auth/login', { method: 'POST', body: { ...credentials } })
}

// Avec learnerId, le nouveau compte reprend la progression de cet apprenant anonyme.
export function register(credentials: Credentials, learnerId: string | null): Promise<Account> {
  const headers: Record<string, string> = {}
  if (learnerId !== null) {
    headers['X-Learner-Id'] = learnerId
  }
  return apiFetch<Account>('/auth/register', {
    method: 'POST',
    body: { ...credentials },
    headers,
  })
}

export async function logout(): Promise<void> {
  await apiFetch<null>('/auth/logout', { method: 'POST' })
}
