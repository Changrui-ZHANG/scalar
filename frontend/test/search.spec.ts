import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LayoutSearchButton from '~/components/layout/LayoutSearchButton.vue'
import LayoutSearchDialog from '~/components/layout/LayoutSearchDialog.vue'

describe('LayoutSearchButton', () => {
  it('affiche le bouton de recherche avec libellé accessible et raccourci', async () => {
    const wrapper = await mountSuspended(LayoutSearchButton, {
      props: {
        shortcutLabel: '⌘ K',
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('aria-label')).toBe('Rechercher')
    expect(wrapper.text()).toContain('Rechercher')
    expect(wrapper.text()).toContain('⌘ K')

    await button.trigger('click')
    expect(wrapper.emitted('openSearch')).toHaveLength(1)
  })
})

describe('LayoutSearchDialog', () => {
  it('monte le dialogue avec le champ combobox et les attributs ARIA en état prêt', async () => {
    const search = useSearch()
    search.open.value = true
    search.status.value = 'ready'

    const wrapper = await mountSuspended(LayoutSearchDialog)

    const input = wrapper.find('input[type="search"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-controls')).toBe('search-results-list')

    // Message vide initial (< 2 caractères)
    expect(wrapper.text()).toContain('Tapez au moins 2 caractères')
  })

  it('affiche l’état de chargement quand status est loading', async () => {
    const search = useSearch()
    search.open.value = true
    search.status.value = 'loading'

    const wrapper = await mountSuspended(LayoutSearchDialog)
    expect(wrapper.text()).toContain('Chargement…')
  })

  it('affiche l’état d’erreur avec un bouton Réessayer', async () => {
    const search = useSearch()
    search.open.value = true
    search.status.value = 'error'

    const wrapper = await mountSuspended(LayoutSearchDialog)
    expect(wrapper.text()).toContain('La recherche est indisponible pour l\'instant.')
    const retryButton = wrapper.find('[data-testid="retry-search"]')
    expect(retryButton.exists()).toBe(true)
    expect(retryButton.text()).toContain('Réessayer')
  })

  it('ferme le dialogue lors de l’appui sur Échap', async () => {
    const search = useSearch()
    search.open.value = true

    const wrapper = await mountSuspended(LayoutSearchDialog)
    const input = wrapper.find('input[type="search"]')

    await input.trigger('keydown', { key: 'Escape' })
    expect(search.open.value).toBe(false)
  })
})
