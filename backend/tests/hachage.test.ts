import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseOptions } from '@node-rs/argon2'
import { ALGORITHME_ARGON2ID, PLANCHER_ARGON2 } from '@scalar/shared/hachage.ts'
import { chargerConfig } from '../src/config/index.ts'
import { MotDePasseService } from '../src/services/mot-de-passe.service.ts'
import { DELAI_PROCESS_MS, lancerJusquAlaSortie, portLibre } from './aide-process.ts'
import {
  SECRET_RUNNER_DEPOT_DE_TEST,
  SECRET_RUNNER_RAPPEL_DE_TEST,
  URL_RUNNER_DE_TEST,
} from './aide-config.ts'

const MOT_DE_PASSE = 'un mot de passe assez long'

// Environnement minimal valide, auquel chaque cas ajoute la variation qu'il
// teste. Reconstruit a chaque appel : `chargerConfig` ne mute rien, mais un
// objet partage se ferait modifier par un cas et fausserait le suivant.
function envValide(surcharges: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    MONGODB_URI: 'mongodb://hote:27017/base',
    SECRET_PSEUDONYMISATION: 's'.repeat(64),
    SECRET_RUNNER_DEPOT: SECRET_RUNNER_DEPOT_DE_TEST,
    SECRET_RUNNER_RAPPEL: SECRET_RUNNER_RAPPEL_DE_TEST,
    URL_RUNNER: URL_RUNNER_DE_TEST,
    ...surcharges,
  } as NodeJS.ProcessEnv
}

describe('hachage de mot de passe', () => {
  const service = new MotDePasseService(PLANCHER_ARGON2)

  // Le cas qui justifie la constante : `@node-rs/argon2` declare `Algorithm` en
  // `const enum`, dont l'export JavaScript est un objet vide. Ecrire
  // `algorithm: Algorithm.Argon2id` compile, passe la relecture, et vaut
  // `undefined` a l'execution une fois les types retires par Node — le paquet
  // retombe alors en silence sur son defaut. Ici la valeur est relue dans un
  // hachage reellement produit.
  it('produit un argon2id, aux parametres declares et non a ceux du paquet', async () => {
    const parametres = { memoireKiB: 20_480, iterations: 3, parallelisme: 2 }
    const relu = parseOptions(await new MotDePasseService(parametres).hacher(MOT_DE_PASSE))

    expect(relu.algorithm).toBe(ALGORITHME_ARGON2ID)
    expect(relu.memoryCost).toBe(parametres.memoireKiB)
    expect(relu.timeCost).toBe(parametres.iterations)
    expect(relu.parallelism).toBe(parametres.parallelisme)
  })

  it('accepte le mot de passe qui a produit le hachage, et lui seul', async () => {
    const hachage = await service.hacher(MOT_DE_PASSE)

    expect(await service.verifier(hachage, MOT_DE_PASSE)).toBe(true)
    expect(await service.verifier(hachage, `${MOT_DE_PASSE} `)).toBe(false)
  })

  // Sans sel par hachage, deux comptes de meme mot de passe se reconnaissent
  // dans une fuite de base, et une table precalculee les casse ensemble.
  it('sale chaque hachage, donc n en produit jamais deux identiques', async () => {
    const [premier, second] = await Promise.all([
      service.hacher(MOT_DE_PASSE),
      service.hacher(MOT_DE_PASSE),
    ])

    expect(premier).not.toBe(second)
  })

  // Un durcissement des parametres ne doit pas invalider les hachages deja en
  // base : les parametres de verification se relisent dans la chaine PHC.
  it('verifie encore un hachage produit sous d autres parametres', async () => {
    const ancien = await new MotDePasseService(PLANCHER_ARGON2).hacher(MOT_DE_PASSE)
    const durci = new MotDePasseService({ memoireKiB: 32_768, iterations: 4, parallelisme: 1 })

    expect(await durci.verifier(ancien, MOT_DE_PASSE)).toBe(true)
  })
})

describe('plancher argon2id valide au demarrage', () => {
  let erreurs: string[]

  beforeEach(() => {
    erreurs = []
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    vi.spyOn(console, 'error').mockImplementation((ligne: unknown) => {
      erreurs.push(String(ligne))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prend le plancher comme valeur par defaut, jamais moins', () => {
    const config = chargerConfig(envValide())

    expect(config.ARGON2_MEMOIRE_KIB).toBe(PLANCHER_ARGON2.memoireKiB)
    expect(config.ARGON2_ITERATIONS).toBe(PLANCHER_ARGON2.iterations)
    expect(config.ARGON2_PARALLELISME).toBe(PLANCHER_ARGON2.parallelisme)
  })

  it('accepte un reglage plus severe que le plancher', () => {
    const config = chargerConfig(envValide({ ARGON2_MEMOIRE_KIB: '65536' }))

    expect(config.ARGON2_MEMOIRE_KIB).toBe(65_536)
  })

  // Une variable par cas : un test global « refuse sous le plancher » passerait
  // encore si deux des trois cessaient d'etre validees.
  const sousLePlancher = {
    ARGON2_MEMOIRE_KIB: String(PLANCHER_ARGON2.memoireKiB - 1),
    ARGON2_ITERATIONS: String(PLANCHER_ARGON2.iterations - 1),
    ARGON2_PARALLELISME: String(PLANCHER_ARGON2.parallelisme - 1),
  }

  for (const [nom, valeur] of Object.entries(sousLePlancher)) {
    it(`refuse de demarrer sous le plancher, en nommant ${nom}`, () => {
      expect(() => chargerConfig(envValide({ [nom]: valeur }))).toThrow('exit:1')
      expect(erreurs.join(' ')).toContain(nom)
    })
  }

  it('refuse une valeur qui n est pas un entier', () => {
    expect(() => chargerConfig(envValide({ ARGON2_ITERATIONS: 'deux' }))).toThrow('exit:1')
    expect(erreurs.join(' ')).toContain('ARGON2_ITERATIONS')
  })
})

// Les cas ci-dessus tournent en processus de test, ou `process.exit` est
// simule. Celui-ci lance le vrai point d'entree : c'est le seul qui prouve que
// le refus se produit **avant** l'ouverture du port, et non a la premiere
// inscription.
describe('refus de demarrer sous le plancher, au niveau du process', () => {
  it(
    'sort en code non nul en nommant la variable, sans ouvrir le port',
    async () => {
      const resultat = await lancerJusquAlaSortie({
        PORT: await portLibre(),
        MONGODB_URI: 'mongodb://127.0.0.1:27017/scalar_test',
        ARGON2_MEMOIRE_KIB: '1024',
      })

      expect(resultat.code).not.toBe(0)
      expect(resultat.stderr).toContain('ARGON2_MEMOIRE_KIB')
      expect(resultat.stdout).not.toContain('api demarree')
      // La connexion n'a meme pas ete tentee : la configuration est validee
      // avant, et l'URI ci-dessus ne pointe sur rien de joignable en test.
      expect(resultat.stderr).not.toContain('connexion a la base impossible')
    },
    DELAI_PROCESS_MS,
  )
})
