/**
 * Les episodes d'un parcours, avec leur statut tire de la progression.
 * Construits a partir du fil servi par l'API : rien n'est recopie ici.
 */
export async function useTrackEpisodes(trackSlug: () => string) {
  // Avant tout `await` : apres, le contexte Nuxt (useState, onMounted) est perdu.
  const progress = useProgress()
  const { data, error, status } = await useFetch<ApiResponse<TrackView>>(
    () => apiUrl(`/tracks/${seg(trackSlug())}`),
    { key: () => `track-${trackSlug()}` },
  )

  const track = computed(() => data.value?.data ?? null)
  const episodes = computed(() =>
    track.value ? buildEpisodes(track.value, progress.completedIn(trackSlug())) : [],
  )

  return { track, episodes, error, status, progress }
}

/** Le fil de chaque parcours, pour la page Parcours et sa recherche. */
export async function useAllTracks(tracks: Ref<readonly TrackSummary[]>) {
  const { data, error, status } = await useAsyncData(
    'track-views',
    () =>
      Promise.all(
        tracks.value.map((t) => $fetch<ApiResponse<TrackView>>(apiUrl(`/tracks/${seg(t.slug)}`))),
      ),
    { watch: [tracks] },
  )

  const views = computed<readonly (TrackView | null)[]>(() =>
    (data.value ?? []).map((response) => response.data),
  )
  return { views, error, status }
}
