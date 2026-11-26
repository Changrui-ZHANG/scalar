import { toValue, type MaybeRefOrGetter } from 'vue'
import type { TrackView } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'
import { sendEvent } from '~/services/events'
import { forgetLearnerId } from '~/services/learnerId'
import { completeLesson } from '~/services/learners'
import { useAuthStore } from '~/stores/auth'
import { useProgressStore } from '~/stores/progress'
import { apiErrorStatus } from '~/utils/apiError'
import { chapterKey, exerciseKey, lessonKey } from '~/utils/track'

export interface CompletionActions {
  open(episode: Episode): void
  complete(episode: Episode): void
}

// Enregistre la leçon terminée sur le serveur, pour le compte ou l'apprenant anonyme.
// En arrière-plan : un échec ne gêne pas la lecture, la progression du navigateur suffit.
async function recordLesson(episode: Episode): Promise<void> {
  const headers = await useAuthStore().learnerHeaders()
  try {
    await completeLesson(episode.trackSlug, episode.chapter.slug, episode.slug, headers)
  } catch (err) {
    // Identifiant anonyme repris par un compte ou disparu : un nouveau sera créé la prochaine fois.
    const status = apiErrorStatus(err)
    if (headers['X-Learner-Id'] && (status === 401 || status === 404)) {
      forgetLearnerId()
    }
  }
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

    // Envoyée à chaque fois, même déjà terminée ici : le serveur ne compte qu'une fois,
    // et une leçon lue avant la connexion finit ainsi elle aussi dans le compte.
    if (episode.kind === 'lesson') {
      recordLesson(episode)
    }

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
