import { computed, onMounted } from 'vue'
import type { ComputedRef } from 'vue'
import type { LessonDetail, TrackView } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'
import { fetchLesson, fetchTrack } from '~/services/tracks'
import { useCompletion } from './useCompletion'
import { listEpisodes } from '~/utils/track'

export interface LessonPage {
  readonly lesson: ComputedRef<LessonDetail>
  readonly track: ComputedRef<TrackView>
  readonly episode: ComputedRef<Episode>
}

export async function useLessonPage(): Promise<LessonPage> {
  const route = useRoute()
  const trackSlug = String(route.params.track ?? route.params.parcours ?? '')
  const chapterSlug = String(route.params.chapter ?? route.params.chapitre ?? '')
  const lessonSlug = String(route.params.lesson ?? route.params.lecon ?? '')

  const { data: trackData } = await useAsyncData<TrackView>(
    `track:${trackSlug}`,
    () => fetchTrack(trackSlug),
  )

  const { data: lessonData } = await useAsyncData<LessonDetail>(
    `lesson:${trackSlug}:${chapterSlug}:${lessonSlug}`,
    () => fetchLesson(trackSlug, chapterSlug, lessonSlug),
  )

  const track = computed<TrackView>(() => {
    if (!trackData.value) {
      throw createError({ statusCode: 404, statusMessage: 'Parcours introuvable', fatal: true })
    }
    return trackData.value
  })

  const lesson = computed<LessonDetail>(() => {
    if (!lessonData.value) {
      throw createError({ statusCode: 404, statusMessage: 'Leçon introuvable', fatal: true })
    }
    return lessonData.value
  })

  const episode = computed<Episode>(() => {
    const list = listEpisodes(track.value)
    const found = list.find(
      (e) => e.kind === 'lesson' && e.chapter.slug === chapterSlug && e.slug === lessonSlug,
    )
    if (!found) {
      throw createError({ statusCode: 404, statusMessage: 'Épisode introuvable', fatal: true })
    }
    return found
  })

  onMounted(() => {
    if (track.value && episode.value) {
      const completion = useCompletion(track.value)
      completion.open(episode.value)
    }
  })

  return {
    lesson,
    track,
    episode,
  }
}
