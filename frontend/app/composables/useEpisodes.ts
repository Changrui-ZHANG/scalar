import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import type { TrackView } from '@scalar/shared/api'
import type { Episode, TrackProgress } from '~/types/episode'
import { useProgressStore } from '~/stores/progress'
import { listEpisodes, trackProgress } from '~/utils/track'

export interface EpisodesState {
  readonly episodes: ComputedRef<readonly Episode[]>
  readonly completed: ComputedRef<ReadonlySet<string>>
  readonly progress: ComputedRef<TrackProgress>
  readonly displayed: ComputedRef<Episode | null>
  readonly previous: ComputedRef<Episode | null>
  readonly next: ComputedRef<Episode | null>
}

export function useEpisodes(
  track: MaybeRefOrGetter<TrackView | null>,
  displayedKey?: MaybeRefOrGetter<string | null>,
): EpisodesState {
  const progressStore = useProgressStore()

  const episodes = computed<readonly Episode[]>(() => {
    const t = toValue(track)
    return t ? listEpisodes(t) : []
  })

  const completed = computed<ReadonlySet<string>>(() => {
    const t = toValue(track)
    return t ? progressStore.completedFor(t.track.slug) : new Set<string>()
  })

  const progress = computed<TrackProgress>(() => {
    return trackProgress(episodes.value, completed.value)
  })

  const displayed = computed<Episode | null>(() => {
    const key = toValue(displayedKey)
    if (!key) return null
    return episodes.value.find((e) => e.key === key) ?? null
  })

  const previous = computed<Episode | null>(() => {
    const cur = displayed.value
    if (!cur) return null
    const list = episodes.value
    const idx = list.findIndex((e) => e.key === cur.key)
    return idx > 0 ? (list[idx - 1] ?? null) : null
  })

  const next = computed<Episode | null>(() => {
    const cur = displayed.value
    if (!cur) return null
    const list = episodes.value
    const idx = list.findIndex((e) => e.key === cur.key)
    return idx !== -1 && idx < list.length - 1 ? (list[idx + 1] ?? null) : null
  })

  return {
    episodes,
    completed,
    progress,
    displayed,
    previous,
    next,
  }
}
