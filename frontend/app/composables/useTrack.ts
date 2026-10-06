/**
 * Les episodes d'un parcours, avec leur statut tire de la progression.
 * Construits a partir du fil servi par l'API : rien n'est recopie ici.
 */
export async function useTrackEpisodes(languageSlug: () => string) {
  // Avant tout `await` : apres, le contexte Nuxt (useState, onMounted) est perdu.
  const progress = useProgress()
  const { data, error, status } = await useFetch<ApiResponse<TrackView>>(
    () => apiUrl(`/languages/${seg(languageSlug())}/track`),
    { key: () => `track-${languageSlug()}` },
  )

  const track = computed(() => data.value?.data ?? null)
  const episodes = computed(() =>
    track.value ? buildEpisodes(track.value, progress.completedIn(languageSlug())) : [],
  )

  return { track, episodes, error, status, progress }
}

/** Le fil de chaque langage, pour la page Parcours et sa recherche. */
export async function useAllTracks(languages: Ref<readonly LanguageSummary[]>) {
  const { data, error, status } = await useAsyncData(
    'tracks',
    () =>
      Promise.all(
        languages.value.map((l) =>
          $fetch<ApiResponse<TrackView>>(apiUrl(`/languages/${seg(l.slug)}/track`)),
        ),
      ),
    { watch: [languages] },
  )

  const tracks = computed<readonly (TrackView | null)[]>(() =>
    (data.value ?? []).map((response) => response.data),
  )
  return { tracks, error, status }
}
