import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import UiButton from '../app/components/ui/UiButton.vue'
import UiIconButton from '../app/components/ui/UiIconButton.vue'
import UiTag from '../app/components/ui/UiTag.vue'
import UiProgressBar from '../app/components/ui/UiProgressBar.vue'
import UiTabs from '../app/components/ui/UiTabs.vue'
import UiStatePanel from '../app/components/ui/UiStatePanel.vue'

describe('Composants UI fondamentaux', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('UiButton rend un bouton avec variant et état désactivé', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: {
        variant: 'primary',
        loading: false,
      },
      slots: {
        default: () => 'Cliquez-moi',
      },
    })
    expect(wrapper.text()).toContain('Cliquez-moi')
    expect(wrapper.classes()).toContain('bg-primary')

    const loadingWrapper = await mountSuspended(UiButton, {
      props: {
        loading: true,
        loadingLabel: 'Vérification…',
      },
      slots: {
        default: () => 'Valider',
      },
    })
    expect(loadingWrapper.text()).toContain('Vérification…')
    expect(loadingWrapper.attributes('disabled')).toBeDefined()
  })

  it('UiIconButton rend un bouton accessible avec infobulle', async () => {
    const wrapper = await mountSuspended(UiIconButton, {
      props: {
        icon: 'lucide:panel-left',
        label: 'Replier le plan',
      },
    })
    expect(wrapper.attributes('aria-label')).toBe('Replier le plan')
    expect(wrapper.attributes('title')).toBe('Replier le plan')
  })

  it('UiTag applique les styles selon la nuance sémantique', async () => {
    const primaryTag = await mountSuspended(UiTag, {
      props: { tone: 'primary' },
      slots: { default: () => 'Leçon' },
    })
    expect(primaryTag.classes()).toContain('text-primary')
    expect(primaryTag.text()).toContain('Leçon')

    const exerciseTag = await mountSuspended(UiTag, {
      props: { tone: 'exercise' },
      slots: { default: () => 'Exercice' },
    })
    expect(exerciseTag.classes()).toContain('text-exercise')

    const successTag = await mountSuspended(UiTag, {
      props: { tone: 'success' },
      slots: { default: () => 'Terminé' },
    })
    expect(successTag.classes()).toContain('text-success')
  })

  it('UiProgressBar reflète fidèlement la valeur entre 0 et 100', async () => {
    const bar = await mountSuspended(UiProgressBar, {
      props: {
        value: 75,
        label: 'Progression JavaScript',
      },
    })
    expect(bar.attributes('aria-valuenow')).toBe('75')
    expect(bar.attributes('aria-label')).toBe('Progression JavaScript')
  })

  it('UiTabs navigue entre les onglets accessibles', async () => {
    const tabs = [
      { id: 'tab1', label: 'Premier' },
      { id: 'tab2', label: 'Second' },
    ]
    const wrapper = await mountSuspended(UiTabs, {
      props: {
        modelValue: 'tab1',
        tabs,
        idPrefix: 'test-tabs',
      },
      slots: {
        tab1: () => 'Contenu 1',
        tab2: () => 'Contenu 2',
      },
    })

    expect(wrapper.text()).toContain('Premier')
    expect(wrapper.text()).toContain('Second')
    expect(wrapper.text()).toContain('Contenu 1')
  })

  it('UiStatePanel affiche icône, titre et texte d’état', async () => {
    const panel = await mountSuspended(UiStatePanel, {
      props: {
        icon: 'lucide:cloud-off',
        title: 'Service indisponible',
        text: 'Veuillez réessayer plus tard.',
      },
    })
    expect(panel.text()).toContain('Service indisponible')
    expect(panel.text()).toContain('Veuillez réessayer plus tard.')
  })
})
