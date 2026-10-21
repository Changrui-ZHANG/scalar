import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrackView } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'
import * as eventsService from '~/services/events'
import { useProgressStore } from '~/stores/progress'
import { exerciseKey, lessonKey } from '~/utils/track'
import { useCompletion } from './useCompletion'

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
          slug: 'first-lesson',
          title: 'Première leçon',
          summary: 'Intro',
          headings: [],
        },
      ],
      exercises: [
        {
          slug: 'first-exercise',
          title: 'Premier exercice',
          instructions: 'Ecris du code',
        },
      ],
    },
  ],
}

describe('composables/useCompletion', () => {
  let sendEventSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sendEventSpy = vi.spyOn(eventsService, 'sendEvent').mockImplementation(() => {})
  })

  it('open adds track to started', () => {
    const { open } = useCompletion(MOCK_TRACK)
    const episode: Episode = {
      kind: 'lesson',
      key: lessonKey('intro', 'first-lesson'),
      trackSlug: 'javascript',
      chapter: {
        slug: 'intro',
        title: 'Introduction',
        number: 1,
        level: 'beginner',
      },
      slug: 'first-lesson',
      title: 'Première leçon',
      excerpt: 'Intro',
      indexInChapter: 1,
      chapterEpisodeCount: 2,
      path: '/parcours/javascript/intro/lecon/first-lesson',
    }

    open(episode)
    const store = useProgressStore()
    expect(store.progress.started).toContain('javascript')
  })

  it('complete sends lesson_completed and chapter_completed if it is the last item', () => {
    const store = useProgressStore()
    // Pre-complete the exercise so the lesson is the last item in the chapter
    store.complete('javascript', [exerciseKey('intro', 'first-exercise')])
    sendEventSpy.mockClear()

    const { complete } = useCompletion(MOCK_TRACK)
    const episode: Episode = {
      kind: 'lesson',
      key: lessonKey('intro', 'first-lesson'),
      trackSlug: 'javascript',
      chapter: {
        slug: 'intro',
        title: 'Introduction',
        number: 1,
        level: 'beginner',
      },
      slug: 'first-lesson',
      title: 'Première leçon',
      excerpt: 'Intro',
      indexInChapter: 1,
      chapterEpisodeCount: 2,
      path: '/parcours/javascript/intro/lecon/first-lesson',
    }

    complete(episode)

    expect(sendEventSpy).toHaveBeenCalledTimes(2)
    expect(sendEventSpy).toHaveBeenCalledWith({
      type: 'lesson_completed',
      track: 'javascript',
      chapter: 'intro',
      slug: 'first-lesson',
    })
    expect(sendEventSpy).toHaveBeenCalledWith({
      type: 'chapter_completed',
      track: 'javascript',
      chapter: 'intro',
    })
  })

  it('does not resend event if episode was already completed', () => {
    const store = useProgressStore()
    store.complete('javascript', [lessonKey('intro', 'first-lesson')])
    sendEventSpy.mockClear()

    const { complete } = useCompletion(MOCK_TRACK)
    const episode: Episode = {
      kind: 'lesson',
      key: lessonKey('intro', 'first-lesson'),
      trackSlug: 'javascript',
      chapter: {
        slug: 'intro',
        title: 'Introduction',
        number: 1,
        level: 'beginner',
      },
      slug: 'first-lesson',
      title: 'Première leçon',
      excerpt: 'Intro',
      indexInChapter: 1,
      chapterEpisodeCount: 2,
      path: '/parcours/javascript/intro/lecon/first-lesson',
    }

    complete(episode)
    expect(sendEventSpy).not.toHaveBeenCalled()
  })
})
