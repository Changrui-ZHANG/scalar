import { LONGUEUR_MINIMALE_SECRET } from '@scalar/shared/proxy.ts'
import type { Config } from '../src/config/index.ts'

export const SECRET_DE_TEST = 's'.repeat(LONGUEUR_MINIMALE_SECRET)

// Configuration minimale valide. Les tests qui n'ont rien a dire sur la
// configuration la prennent telle quelle ; ceux qui en testent une variation
// la surchargent champ par champ.
export function configDeTest(surcharges: Partial<Config> = {}): Config {
  return {
    PORT: 3001,
    MONGODB_URI: 'mongodb://127.0.0.1:27017/scalar_test',
    SECRET_PSEUDONYMISATION: SECRET_DE_TEST,
    ...surcharges,
  }
}
