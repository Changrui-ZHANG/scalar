import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { TrackView } from '@scalar/shared/api'
import type { TrackCard } from '~/types/episode'
import { fetchTrack } from '~/services/tracks'
import { useProgressStore } from '~/stores/progress'
import { buildTrackCard } from '~/utils/track'

export interface TrackState {
  readonly track: ComputedRef<TrackView>
  readonly card: ComputedRef<TrackCard>
  refresh(): Promise<void>
}

export async function useTrack(slug?: MaybeRefOrGetter<string>): Promise<TrackState> {
  const route = useRoute()
  const trackSlug = computed<string>(() => {
    if (slug !== undefined) {
      return toValue(slug)
    }
    const param = route.params.track ?? route.params.parcours
    const val = Array.isArray(param) ? param[0] : param
    return val ?? ''
  })

  const progressStore = useProgressStore()

  const { data: trackData, error, refresh } = await useAsyncData<TrackView>(
    () => `track:${trackSlug.value}`,
    () => fetchTrack(trackSlug.value),
    { watch: [trackSlug] },
  )

  // Erreur de l'API (403 Premium, 5xx…) : la page d'erreur reçoit son vrai statut.
  if (error.value) throw toPageError(error.value)

  const track = computed<TrackView>(() => {
    if (!trackData.value) {
      throw createError({ statusCode: 404, statusMessage: 'Parcours introuvable', fatal: true })
    }
    return trackData.value
  })

  const card = computed<TrackCard>(() => {
    const t = track.value
    return buildTrackCard(t, progressStore.progress)
  })

  return {
    track,
    card,
    refresh,
  }
}


