import type { UserRepository } from '../repository/user.repository.ts'
import type { PasswordHasher } from './password-hasher.service.ts'

export interface ConfiguredAdmin {
  readonly email: string | undefined
  readonly password: string | undefined
  readonly nodeEnv: string
}

export async function ensureConfiguredAdmin(
  users: UserRepository,
  hasher: PasswordHasher,
  { email, password, nodeEnv }: ConfiguredAdmin,
): Promise<void> {
  // Ce mot de passe local n'a aucune longueur minimale : jamais sur un serveur public.
  if (nodeEnv === 'production' || !email || !password) {
    return
  }
  await users.upsertAdmin({ email, passwordHash: await hasher.hash(password) })
}
