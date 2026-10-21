import { computed, onMounted, ref, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type { LessonDetail, PublicExercise, TrackView } from '@scalar/shared/api'
import type { Episode } from '~/types/episode'
import { fetchExercise, fetchLesson, fetchTrack } from '~/services/tracks'
import { useCompletion } from './useCompletion'
import { usePreferencesStore } from '~/stores/preferences'
import { exerciseKey, listEpisodes } from '~/utils/track'

export interface ExercisePage {
  readonly exercise: ComputedRef<PublicExercise>
  readonly track: ComputedRef<TrackView>
  readonly episode: ComputedRef<Episode>
  readonly lessons: Ref<readonly LessonDetail[] | null>
  readonly lessonsStatus: Ref<'idle' | 'pending' | 'ready' | 'error'>
  readonly revealedHints: ComputedRef<number>
  loadLessons(): Promise<void>
  watchLessonTab(isOpen: MaybeRefOrGetter<boolean>): void
  revealHint(): void
}

export async function useExercisePage(): Promise<ExercisePage> {
  const route = useRoute()
  const trackSlug = String(route.params.track ?? route.params.parcours ?? '')
  const chapterSlug = String(route.params.chapter ?? route.params.chapitre ?? '')
  const exerciseSlug = String(route.params.exercise ?? route.params.exercice ?? '')

  const preferencesStore = usePreferencesStore()

  const { data: trackData } = await useAsyncData<TrackView>(
    `track:${trackSlug}`,
    () => fetchTrack(trackSlug),
  )

  const { data: exerciseData } = await useAsyncData<PublicExercise>(
    `exercise:${trackSlug}:${chapterSlug}:${exerciseSlug}`,
    () => fetchExercise(trackSlug, chapterSlug, exerciseSlug),
  )

  const track = computed<TrackView>(() => {
    if (!trackData.value) {
      throw createError({ statusCode: 404, statusMessage: 'Parcours introuvable', fatal: true })
    }
    return trackData.value
  })

  const exercise = computed<PublicExercise>(() => {
    if (!exerciseData.value) {
      throw createError({ statusCode: 404, statusMessage: 'Exercice introuvable', fatal: true })
    }
    return exerciseData.value
  })

  const episode = computed<Episode>(() => {
    const list = listEpisodes(track.value)
    const found = list.find(
      (e) => e.kind === 'exercise' && e.chapter.slug === chapterSlug && e.slug === exerciseSlug,
    )
    if (!found) {
      throw createError({ statusCode: 404, statusMessage: 'Épisode introuvable', fatal: true })
    }
    return found
  })

  const key = computed(() => exerciseKey(chapterSlug, exerciseSlug))

  const revealedHints = computed(() => {
    const hintsCount = exercise.value.hints?.length ?? 0
    return preferencesStore.revealedHints(key.value, hintsCount)
  })

  function revealHint(): void {
    const hintsCount = exercise.value.hints?.length ?? 0
    preferencesStore.revealHint(key.value, hintsCount)
  }

  const lessons = ref<readonly LessonDetail[] | null>(null)
  const lessonsStatus = ref<'idle' | 'pending' | 'ready' | 'error'>('idle')

  async function loadLessons(): Promise<void> {
    if (lessonsStatus.value === 'ready' || lessonsStatus.value === 'pending') {
      return
    }

    const currentChapter = track.value.chapters.find((c) => c.slug === chapterSlug)
    if (!currentChapter || currentChapter.lessons.length === 0) {
      lessons.value = []
      lessonsStatus.value = 'ready'
      return
    }

    lessonsStatus.value = 'pending'
    try {
      const details = await Promise.all(
        currentChapter.lessons.map((l) => fetchLesson(trackSlug, chapterSlug, l.slug)),
      )
      lessons.value = details
      lessonsStatus.value = 'ready'
    } catch {
      lessonsStatus.value = 'error'
    }
  }

  function watchLessonTab(isOpen: MaybeRefOrGetter<boolean>): void {
    watch(
      () => toValue(isOpen),
      (open) => {
        if (open && lessonsStatus.value === 'idle') {
          loadLessons()
        }
      },
      { immediate: true },
    )
  }

  onMounted(() => {
    if (track.value && episode.value) {
      const completion = useCompletion(track.value)
      completion.open(episode.value)
    }
  })

  return {
    exercise,
    track,
    episode,
    lessons,
    lessonsStatus,
    revealedHints,
    loadLessons,
    watchLessonTab,
    revealHint,
  }
}
