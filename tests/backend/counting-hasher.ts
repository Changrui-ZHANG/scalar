import { fakeHasher } from './auth.fixtures.ts'
import type { PasswordHasher } from '../../backend/src/service/password-hasher.service.ts'

/** Compte les mots de passe réellement vérifiés : un essai bloqué par la limite n'arrive pas jusque-là. */
export class CountingHasher implements PasswordHasher {
  verifications = 0

  hash(password: string): Promise<string> {
    return fakeHasher.hash(password)
  }

  verify(hash: string, password: string): Promise<boolean> {
    this.verifications += 1
    return fakeHasher.verify(hash, password)
  }
}
