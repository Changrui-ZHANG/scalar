/** Langages proposes par Scalar, avec leur resume et leur prerequis. */
export async function useLanguages() {
  const { data, error, status } = await useFetch<ApiResponse<LanguageSummary[]>>(
    () => apiUrl('/languages'),
    { key: 'languages' },
  )

  const languages = computed(() => data.value?.data ?? [])

  /** Le langage d'un slug ; nul s'il n'est pas propose, ce qui vaut un 404. */
  const find = (slug: string): LanguageSummary | null =>
    languages.value.find((l) => l.slug === slug) ?? null

  return { languages, find, error, status }
}
