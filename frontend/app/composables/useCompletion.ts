import { toValue, type MaybeRefOrGetter } from 'vue'
import type { TrackView } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'
import { sendEvent } from '~/services/events'
import { useProgressStore } from '~/stores/progress'
import { chapterKey, exerciseKey, lessonKey } from '~/utils/track'

export interface CompletionActions {
  open(episode: Episode): void
  complete(episode: Episode): void
}

export function useCompletion(track: MaybeRefOrGetter<TrackView>): CompletionActions {
  const progressStore = useProgressStore()

  function open(episode: Episode): void {
    progressStore.open(episode.trackSlug)
  }

  function complete(episode: Episode): void {
    const trackView = toValue(track)
    const chapterSlug = episode.chapter.slug
    const chapterObj = trackView?.chapters?.find((c) => c.slug === chapterSlug)

    const keysToComplete: string[] = [episode.key]

    if (chapterObj) {
      const currentCompleted = progressStore.completedFor(episode.trackSlug)
      const allChapterKeys = [
        ...chapterObj.lessons.map((l) => lessonKey(chapterSlug, l.slug)),
        ...chapterObj.exercises.map((e) => exerciseKey(chapterSlug, e.slug)),
      ]

      const otherKeysAllDone = allChapterKeys
        .filter((k) => k !== episode.key)
        .every((k) => currentCompleted.has(k))

      if (otherKeysAllDone) {
        keysToComplete.push(chapterKey(chapterSlug))
      }
    }

    const newlyCompleted = progressStore.complete(episode.trackSlug, keysToComplete)

    for (const key of newlyCompleted) {
      if (key === episode.key) {
        if (episode.kind === 'lesson') {
          sendEvent({
            type: 'lesson_completed',
            track: episode.trackSlug,
            chapter: chapterSlug,
            slug: episode.slug,
          })
        } else if (episode.kind === 'exercise') {
          sendEvent({
            type: 'exercise_completed',
            track: episode.trackSlug,
            chapter: chapterSlug,
            slug: episode.slug,
          })
        }
      } else if (key === chapterKey(chapterSlug)) {
        sendEvent({
          type: 'chapter_completed',
          track: episode.trackSlug,
          chapter: chapterSlug,
        })
      }
    }
  }

  return {
    open,
    complete,
  }
}
