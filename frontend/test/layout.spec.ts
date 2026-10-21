import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import LayoutHeader from '../app/components/layout/LayoutHeader.vue'
import LayoutLearningMobileBar from '../app/components/layout/LayoutLearningMobileBar.vue'
import LayoutPlan from '../app/components/layout/LayoutPlan.vue'
import type { TrackView } from '@scalar/shared/api'
import type { Episode } from '../app/types/episode'

describe('Composants de mise en page', () => {
  const sampleTrackView: TrackView = {
    track: {
      slug: 'javascript',
      name: 'JavaScript',
      summary: 'Le langage du Web.',
      programmingLanguage: 'javascript',
      prerequisite: null,
    },
    chapters: [
      {
        slug: 'variables',
        title: 'Variables',
        summary: 'Déclaration de variables',
        level: 'beginner',
        number: 1,
        lessons: [
          {
            slug: 'let-const',
            title: 'let et const',
            summary: 'Différences',
            headings: [],
          },
        ],
        exercises: [
          {
            slug: 'swap',
            title: 'Échanger deux valeurs',
            instructions: 'Échangez a et b.',
          },
        ],
      },
    ],
  }

  const sampleEpisode: Episode = {
    kind: 'lesson',
    key: 'lesson:variables:let-const',
    trackSlug: 'javascript',
    chapter: {
      slug: 'variables',
      title: 'Variables',
      number: 1,
      level: 'beginner',
    },
    slug: 'let-const',
    title: 'let et const',
    excerpt: 'Différences',
    indexInChapter: 1,
    chapterEpisodeCount: 2,
    path: '/parcours/javascript/variables/lecon/let-const',
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('LayoutHeader affiche le logo, le lien vers les parcours et le nom du parcours si fourni', async () => {
    const wrapper = await mountSuspended(LayoutHeader, {
      props: {
        track: { slug: 'javascript', name: 'JavaScript' },
        planToggle: true,
      },
    })

    expect(wrapper.text()).toContain('Scalar')
    expect(wrapper.text()).toContain('JavaScript')
    expect(wrapper.text()).toContain('Parcours')
    expect(wrapper.text()).toContain('Bac à sable')
  })

  it('LayoutLearningMobileBar affiche le fil et le titre de l’épisode courant', async () => {
    const wrapper = await mountSuspended(LayoutLearningMobileBar, {
      props: {
        episode: sampleEpisode,
        trackName: 'JavaScript',
      },
    })

    expect(wrapper.text()).toContain('JavaScript · Variables · 1/2')
    expect(wrapper.text()).toContain('let et const')
  })

  it('LayoutPlan liste les niveaux, chapitres et épisodes', async () => {
    const wrapper = await mountSuspended(LayoutPlan, {
      props: {
        track: sampleTrackView,
        episodes: [sampleEpisode],
        progress: { done: 0, total: 2, percent: 0, status: 'in_progress', current: sampleEpisode },
        completed: new Set(),
        displayedKey: 'lesson:variables:let-const',
        collapsed: false,
      },
    })

    expect(wrapper.text()).toContain('JavaScript')
    expect(wrapper.text()).toContain('0 épisodes sur 2 · 0 %')
    expect(wrapper.text()).toContain('DÉBUTANT')
    expect(wrapper.text()).toContain('Variables')
    expect(wrapper.text()).toContain('let et const')
  })
})
