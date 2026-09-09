import { PLANCHER_ARGON2 } from '@scalar/shared/hachage.ts'
import { LONGUEUR_MINIMALE_SECRET } from '@scalar/shared/proxy.ts'
import type { Config } from '../src/config/index.ts'

export const SECRET_DE_TEST = 's'.repeat(LONGUEUR_MINIMALE_SECRET)
export const SECRET_RUNNER_DEPOT_DE_TEST = 'd'.repeat(LONGUEUR_MINIMALE_SECRET)
export const SECRET_RUNNER_RAPPEL_DE_TEST = 'r'.repeat(LONGUEUR_MINIMALE_SECRET)

// Port sur lequel rien n'ecoute : un appel au runner echoue immediatement en
// `ECONNREFUSED`, jamais par le delai declare — les tests qui n'ont rien a
// dire sur le runner restent rapides.
export const URL_RUNNER_DE_TEST = 'http://127.0.0.1:1'

// Configuration minimale valide. Les tests qui n'ont rien a dire sur la
// configuration la prennent telle quelle ; ceux qui en testent une variation
// la surchargent champ par champ.
export function configDeTest(surcharges: Partial<Config> = {}): Config {
  return {
    NODE_ENV: 'test',
    PORT: 3001,
    MONGODB_URI: 'mongodb://127.0.0.1:27017/scalar_test',
    SECRET_PSEUDONYMISATION: SECRET_DE_TEST,
    SECRET_RUNNER_DEPOT: SECRET_RUNNER_DEPOT_DE_TEST,
    SECRET_RUNNER_RAPPEL: SECRET_RUNNER_RAPPEL_DE_TEST,
    URL_RUNNER: URL_RUNNER_DE_TEST,
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
