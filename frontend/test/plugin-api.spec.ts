import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { A_PROPAGER, entetesAPropager } from '../app/utils/entetes-api'
import plugin from '../app/plugins/api'

const { entetesDemandees } = vi.hoisted(() => ({
  entetesDemandees: vi.fn(() => ({ cookie: 'scalar_session=abc' })),
}))

mockNuxtImport('useRequestHeaders', () => entetesDemandees)

describe("service unique d'appel a l'API", () => {
  // `entetesAPropager` filtre ce qu'on lui donne ; c'est le plugin qui decide
  // ce qu'il demande au rendu serveur, et cette decision n'etait couverte par
  // rien. Ramener l'argument a `['cookie']` — une regression d'un mot — ferait
  // perdre la chaine de transfert a tout appel rendu au serveur, donc classer
  // chacun en `interne` hors des plafonds, sans qu'aucun cas
  // d'`entetes-api.spec.ts` ne bronche : ils construisent tous leur entree.
  it('demande exactement la liste fermee, jamais une liste ecrite sur place', () => {
    plugin(undefined as never)

    expect(entetesDemandees).toHaveBeenCalledWith([...A_PROPAGER])
  })

  // La liste demandee et la liste filtree sont la meme : sans cette egalite,
  // un en-tete pourrait etre demande au rendu serveur puis jete en silence.
  it('ne demande rien que la liste fermee ne laisserait passer', () => {
    plugin(undefined as never)

    const demandees = entetesDemandees.mock.calls.at(-1)?.[0] ?? []
    const propagees = Object.keys(
      entetesAPropager(Object.fromEntries(demandees.map((nom) => [nom, 'x']))),
    )

    expect(propagees).toEqual([...demandees])
  })
})
