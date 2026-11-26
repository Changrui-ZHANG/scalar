import type { Account, Credentials } from '~/types/account'
import { apiFetch } from './api'

// Le backend pose et efface lui-même le cookie de session (httpOnly) :
// le site n'a jamais le jeton entre les mains.

export function fetchMe(): Promise<Account> {
  return apiFetch<Account>('/auth/me')
}

// Avec learnerId, la progression de cet apprenant anonyme passe au compte :
// reprise telle quelle à l'inscription, ajoutée à celle du compte à la connexion.
function learnerHeader(learnerId: string | null): Record<string, string> {
  return learnerId === null ? {} : { 'X-Learner-Id': learnerId }
}

export function login(credentials: Credentials, learnerId: string | null): Promise<Account> {
  return apiFetch<Account>('/auth/login', {
    method: 'POST',
    body: { ...credentials },
    headers: learnerHeader(learnerId),
  })
}

export function register(credentials: Credentials, learnerId: string | null): Promise<Account> {
  return apiFetch<Account>('/auth/register', {
    method: 'POST',
    body: { ...credentials },
    headers: learnerHeader(learnerId),
  })
}

export async function logout(): Promise<void> {
  await apiFetch<null>('/auth/logout', { method: 'POST' })
}
