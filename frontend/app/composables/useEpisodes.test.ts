import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { TrackView } from '@scalar/shared/api'
import { useProgressStore } from '~/stores/progress'
import { lessonKey } from '~/utils/track'
import { useEpisodes } from './useEpisodes'

const MOCK_TRACK: TrackView = {
  track: {
    slug: 'javascript',
    name: 'JavaScript',
    summary: 'Le langage du Web',
    programmingLanguage: 'javascript',
    prerequisite: null,
  },
  chapters: [
    {
      slug: 'intro',
      title: 'Introduction',
      summary: 'Les bases',
      level: 'beginner',
      number: 1,
      lessons: [
        {
          slug: 'l1',
          title: 'Leçon 1',
          summary: 'Intro 1',
          headings: [],
        },
        {
          slug: 'l2',
          title: 'Leçon 2',
          summary: 'Intro 2',
          headings: [],
        },
      ],
      exercises: [
        {
          slug: 'e1',
          title: 'Exercice 1',
          instructions: 'Code 1',
        },
      ],
    },
  ],
}

describe('composables/useEpisodes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('computes episodes list and initial progress', () => {
    const { episodes, progress } = useEpisodes(MOCK_TRACK)
    expect(episodes.value).toHaveLength(3)
    expect(progress.value.total).toBe(3)
    expect(progress.value.done).toBe(0)
    expect(progress.value.status).toBe('not_started')
    expect(progress.value.current?.slug).toBe('l1')
  })

  it('updates progress when store completes episodes', () => {
    const store = useProgressStore()
    const { progress } = useEpisodes(MOCK_TRACK)

    store.complete('javascript', [lessonKey('intro', 'l1')])
    expect(progress.value.done).toBe(1)
    expect(progress.value.percent).toBe(33)
    expect(progress.value.status).toBe('in_progress')
    expect(progress.value.current?.slug).toBe('l2')
  })

  it('finds displayed, previous, and next episodes', () => {
    const l2Key = lessonKey('intro', 'l2')
    const { displayed, previous, next } = useEpisodes(MOCK_TRACK, l2Key)

    expect(displayed.value?.slug).toBe('l2')
    expect(previous.value?.slug).toBe('l1')
    expect(next.value?.slug).toBe('e1')
  })
})
