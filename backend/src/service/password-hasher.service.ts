import argon2 from 'argon2'
import type { HashOptions } from 'argon2'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
}

// Minimum recommande par l'OWASP pour argon2id.
const OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, OPTIONS)
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password)
  }
}
