import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { TrackSummary, TrackView } from '@scalar/shared/api'
import type { ResumeTarget, TrackCard } from '~/types/episode'
import { fetchAllTrackViews } from '~/services/tracks'
import { useProgressStore } from '~/stores/progress'
import { buildTrackCard, listEpisodes, pickResume } from '~/utils/track'

export interface TracksState {
  readonly tracks: ComputedRef<readonly TrackSummary[]>
  readonly views: ComputedRef<readonly TrackView[]>
  readonly cards: ComputedRef<readonly TrackCard[]>
  readonly resume: ComputedRef<ResumeTarget | null>
  readonly start: ComputedRef<{ readonly trackName: string; readonly path: string } | null>
  refresh(): Promise<void>
}

export async function useTracks(): Promise<TracksState> {
  const progressStore = useProgressStore()

  const { data: viewsData, refresh } = await useAsyncData<readonly TrackView[]>(
    'tracks-all-views',
    () => fetchAllTrackViews(),
  )

  const views = computed<readonly TrackView[]>(() => viewsData.value ?? [])

  const tracks = computed<readonly TrackSummary[]>(() =>
    views.value.map((v) => v.track),
  )

  const cards = computed<readonly TrackCard[]>(() => {
    return views.value.map((view) => buildTrackCard(view, progressStore.progress))
  })

  const resume = computed<ResumeTarget | null>(() => {
    // Toujours null au rendu serveur pour éviter le flash d'hydratation
    if (!import.meta.client) return null
    return pickResume(cards.value, progressStore.startedByRecency)
  })

  const start = computed<{ readonly trackName: string; readonly path: string } | null>(() => {
    const firstView = views.value[0]
    if (!firstView) return null
    const episodes = listEpisodes(firstView)
    const firstEp = episodes[0]
    if (!firstEp) return null
    return {
      trackName: firstView.track.name,
      path: firstEp.path,
    }
  })

  return {
    tracks,
    views,
    cards,
    resume,
    start,
    refresh,
  }
}
