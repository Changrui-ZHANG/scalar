import { PLANCHER_ARGON2 } from '@scalar/shared/hachage.ts'
import { LONGUEUR_MINIMALE_SECRET } from '@scalar/shared/proxy.ts'
import type { Config } from '../src/config/index.ts'

export const SECRET_DE_TEST = 's'.repeat(LONGUEUR_MINIMALE_SECRET)

// Configuration minimale valide. Les tests qui n'ont rien a dire sur la
// configuration la prennent telle quelle ; ceux qui en testent une variation
// la surchargent champ par champ.
export function configDeTest(surcharges: Partial<Config> = {}): Config {
  return {
    NODE_ENV: 'test',
    PORT: 3001,
    MONGODB_URI: 'mongodb://127.0.0.1:27017/scalar_test',
    SECRET_PSEUDONYMISATION: SECRET_DE_TEST,
    // Le plancher, jamais moins : `config/` refuse de demarrer en dessous, et
    // une configuration de test plus faible ferait mesurer autre chose que ce
    // qui tourne en production. Le cout est assume — quelques dizaines de
    // millisecondes par mot de passe reellement hache.
    ARGON2_MEMOIRE_KIB: PLANCHER_ARGON2.memoireKiB,
    ARGON2_ITERATIONS: PLANCHER_ARGON2.iterations,
    ARGON2_PARALLELISME: PLANCHER_ARGON2.parallelisme,
    ...surcharges,
  }
}
