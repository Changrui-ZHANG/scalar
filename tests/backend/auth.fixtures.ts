import type { PasswordHasher } from '../../backend/src/service/password-hasher.service.ts'

export const TEST_JWT_SECRET = 'secret-de-test-assez-long-pour-hs256-0123456789'

// Hachage factice : argon2 a ses propres tests, ici seul le flux compte.
export const fakeHasher: PasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (hash, password) => hash === `hash:${password}`,
}

/** Dependances d'authentification de `buildApp` pour les tests. */
export const AUTH_DEPENDENCIES = {
  authAttemptsLimit: 1_000,
  jwtSecret: TEST_JWT_SECRET,
  secureCookie: false,
  hasher: fakeHasher,
} as const
