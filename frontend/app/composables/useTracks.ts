/** Parcours proposes par Scalar, avec leur resume et leur prerequis. */
export async function useTracks() {
  const { data, error, status } = await useFetch<ApiResponse<TrackSummary[]>>(
    () => apiUrl('/tracks'),
    { key: 'tracks' },
  )

  const tracks = computed(() => data.value?.data ?? [])

  /** Le parcours d'un slug ; nul s'il n'est pas propose, ce qui vaut un 404. */
  const find = (slug: string): TrackSummary | null =>
    tracks.value.find((t) => t.slug === slug) ?? null

  return { tracks, find, error, status }
}
