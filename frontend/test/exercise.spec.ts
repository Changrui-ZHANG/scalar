import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { ProjectionExercicePublique } from '@scalar/shared/exercise.ts'
import Exercice from '../app/pages/exercices/[slug].vue'

const { appelApi } = vi.hoisted(() => ({
  appelApi: vi.fn(),
}))

// La page lit le slug depuis la route : sans ce mock elle reçoit la route de
// test par défaut, sans paramètre. Un objet réactif partagé, plutôt qu'un
// littéral recréé à chaque appel, pour que muter `routeMock.params.slug`
// après le montage simule une navigation qui réutilise l'instance — c'est
// exactement ce que le `watch` de la page doit observer.
const routeMock = reactive({ params: { slug: 'addition-de-deux-nombres' } })
mockNuxtImport('useRoute', () => () => routeMock)

function exerciceMock(
  surcharges: Partial<ProjectionExercicePublique> = {},
): ProjectionExercicePublique {
  return {
    id: 'a',
    slug: 'addition-de-deux-nombres',
    title: 'Addition de deux nombres',
    statement: 'Écrivez une fonction qui additionne deux nombres.',
    starterCode: 'function addition(a, b) {}',
    language: 'javascript',
    testsVisibles: [
      {
        name: 'additionne deux nombres positifs',
        assertion: 'retourne la somme',
        code: 'expect(addition(2, 3)).toBe(5)',
      },
    ],
    testsCaches: [{ name: 'gère les nombres négatifs', assertion: 'retourne une somme correcte' }],
    totalTests: 2,
    estVerrouille: false,
    ...surcharges,
  }
}

describe("page d'exercice", () => {
  // Un seul montage vivant a la fois : sans le demonter, le `watch` de
  // l'instance precedente reste actif sur `routeMock`, partage entre les
  // tests, et reagit encore quand un test suivant modifie le slug.
  let page: Awaited<ReturnType<typeof mountSuspended>> | undefined

  async function monter() {
    page = await mountSuspended(Exercice)

    return page
  }

  beforeEach(() => {
    appelApi.mockReset()
    ;(useNuxtApp() as unknown as { _customApi?: unknown })._customApi = appelApi
    routeMock.params.slug = 'addition-de-deux-nombres'
  })

  afterEach(() => {
    page?.unmount()
    page = undefined
  })

  it("appelle l'API sur le slug de la route", async () => {
    appelApi.mockResolvedValue(exerciceMock())

    await monter()

    expect(appelApi).toHaveBeenCalledWith('/exercises/addition-de-deux-nombres')
  })

  it("affiche le titre et l'énoncé de l'exercice", async () => {
    appelApi.mockResolvedValue(exerciceMock())

    const rendu = await monter()

    expect(rendu.find('h1').text()).toBe('Addition de deux nombres')
    expect(rendu.text()).toContain('Écrivez une fonction qui additionne deux nombres.')
  })

  it('affiche le code de départ', async () => {
    appelApi.mockResolvedValue(exerciceMock())

    const rendu = await monter()

    expect(rendu.text()).toContain('function addition(a, b) {}')
  })

  it('affiche le décompte total et le code de chaque test visible', async () => {
    appelApi.mockResolvedValue(exerciceMock())

    const rendu = await monter()

    expect(rendu.text()).toContain('Tests (1 visibles sur 2)')
    expect(rendu.text()).toContain('additionne deux nombres positifs')
    expect(rendu.text()).toContain('expect(addition(2, 3)).toBe(5)')
  })

  it('nomme un test caché sans jamais afficher son code', async () => {
    appelApi.mockResolvedValue(
      exerciceMock({
        testsCaches: [
          {
            name: 'gère les nombres négatifs',
            assertion: 'retourne une somme correcte',
            // Un champ qui ne devrait jamais exister sur le contrat : meme
            // present dans la reponse, le gabarit ne doit rien en montrer.
            ...({ code: 'MARQUEUR_DE_CORPS_CACHE_UNIQUE' } as Record<string, unknown>),
          },
        ],
      }),
    )

    const rendu = await monter()

    expect(rendu.text()).toContain('gère les nombres négatifs')
    expect(rendu.text()).toContain('test caché')
    expect(rendu.html()).not.toContain('MARQUEUR_DE_CORPS_CACHE_UNIQUE')
  })

  it("affiche le message du serveur quand l'exercice est introuvable", async () => {
    appelApi.mockRejectedValue({
      data: {
        code: 'EXERCICE_INTROUVABLE',
        message: "Cet exercice n'existe pas ou n'est plus disponible.",
      },
    })

    const rendu = await monter()

    expect(rendu.find('[role="alert"]').text()).toBe(
      "Cet exercice n'existe pas ou n'est plus disponible.",
    )
  })

  it("dit quoi faire quand la demande n'a même pas abouti", async () => {
    appelApi.mockRejectedValue(new Error('réseau coupé'))

    const rendu = await monter()

    const alerte = rendu.find('[role="alert"]').text()

    expect(alerte).not.toBe('')
    expect(alerte).not.toContain('réseau coupé')
  })

  it('encode le slug de la route dans le chemin appelé', async () => {
    routeMock.params.slug = 'exercice avec espace/étrange'
    appelApi.mockResolvedValue(exerciceMock())

    await monter()

    expect(appelApi).toHaveBeenCalledWith(
      `/exercises/${encodeURIComponent('exercice avec espace/étrange')}`,
    )
  })

  it("recharge l'exercice quand le slug de la route change sans remonter le composant", async () => {
    appelApi.mockResolvedValueOnce(exerciceMock())

    const rendu = await monter()

    expect(rendu.find('h1').text()).toBe('Addition de deux nombres')
    expect(appelApi).toHaveBeenCalledWith('/exercises/addition-de-deux-nombres')

    appelApi.mockResolvedValueOnce(
      exerciceMock({
        slug: 'soustraction-de-deux-nombres',
        title: 'Soustraction de deux nombres',
      }),
    )

    // Vue Router réutilise l'instance du composant lors d'une navigation
    // entre deux pages `[slug].vue` : seul le paramètre change.
    routeMock.params.slug = 'soustraction-de-deux-nombres'
    await flushPromises()

    expect(appelApi).toHaveBeenCalledTimes(2)
    expect(appelApi).toHaveBeenLastCalledWith('/exercises/soustraction-de-deux-nombres')
    expect(rendu.find('h1').text()).toBe('Soustraction de deux nombres')
  })
})
