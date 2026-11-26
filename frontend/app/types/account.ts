// Compte connecté, tel que le renvoient /auth/login, /auth/register et /auth/me.
export interface Account {
  readonly id: string
  readonly email: string
  readonly role: 'learner' | 'admin'
}

export interface Credentials {
  readonly email: string
  readonly password: string
}
