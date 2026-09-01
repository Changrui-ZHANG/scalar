import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import type { ChargeUtileSession } from '@scalar/shared/session.ts'
import { A_PROPAGER, entetesAPropager } from '../app/utils/entetes-api'
import { useSessionStore } from '../app/stores/session.ts'
import plugin from '../app/plugins/api'

const { entetesDemandees } = vi.hoisted(() => ({
  entetesDemandees: vi.fn(() => ({ cookie: 'scalar_session=abc' })),
}))

mockNuxtImport('useRequestHeaders', () => entetesDemandees)

describe("service unique d'appel a l'API", () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

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

  it('rehydrate la session dans le magasin Pinia en cas de succes', async () => {
    const chargeUtile: ChargeUtileSession = {
      id: 'usr_123',
      displayName: 'Bob Martin',
      accountState: 'active',
      situations: [],
    }

    const mockFetch = vi.fn().mockResolvedValue(chargeUtile)
    const spyCreate = vi.spyOn($fetch, 'create').mockReturnValue(mockFetch as never)

    const store = useSessionStore(pinia)
    store.fermer()

    await plugin({ $pinia: pinia } as never)

    expect(mockFetch).toHaveBeenCalledWith('/sessions/current')
    expect(store.compte).toEqual(chargeUtile)

    spyCreate.mockRestore()
  })

  it('vide la session dans le magasin Pinia en cas d echec de rehydratation', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('401 Non authentifie'))
    const spyCreate = vi.spyOn($fetch, 'create').mockReturnValue(mockFetch as never)

    const store = useSessionStore(pinia)
    store.fermer()

    await plugin({ $pinia: pinia } as never)

    expect(mockFetch).toHaveBeenCalledWith('/sessions/current')
    expect(store.compte).toBeNull()

    spyCreate.mockRestore()
  })

  it('ne fait pas d appel redondant si la session est deja presente cote client', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ id: 'autre' })
    const spyCreate = vi.spyOn($fetch, 'create').mockReturnValue(mockFetch as never)

    const store = useSessionStore(pinia)
    store.ouvrir({
      id: 'existant',
      displayName: 'Existant',
      accountState: 'active',
      situations: [],
    })

    await plugin({ $pinia: pinia } as never)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(store.compte?.id).toBe('existant')

    spyCreate.mockRestore()
  })
})

