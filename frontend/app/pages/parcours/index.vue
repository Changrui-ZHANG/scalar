<script setup lang="ts">
/**
 * Tous les parcours : reprise, recherche, filtres par statut, cartes.
 * La recherche et le filtre vivent dans l'URL (`?q=…&statut=…`) : precedent
 * et suivant du navigateur les restaurent, resultats compris.
 */
/** Une entree d'historique par recherche, pas par touche frappee. */
const SEARCH_DELAY_MS = 350

useSeoMeta({
  title: 'Parcours — Scalar',
  description:
    'Chaque parcours est un fil continu de leçons et d’exercices. Avancez dans l’ordre ou reprenez librement un épisode.',
})

const route = useRoute()
const router = useRouter()
const { tracks, error: tracksError } = await useTracks()
const { views, error: viewsError, status } = await useAllTracks(tracks)
const progress = useProgress()

const loadError = computed(() => tracksError.value ?? viewsError.value)

const entries = computed(() =>
  tracks.value.map((track, i) => {
    const view = views.value[i] ?? null
    const episodes = view ? buildEpisodes(view, progress.completedIn(track.slug)) : []
    return {
      track,
      index: i + 1,
      episodes,
      status: trackStatus(episodes, progress.isStarted(track.slug)),
    }
  }),
)

/** Premier episode non termine du premier parcours en cours. */
const resume = computed(() => {
  for (const entry of entries.value) {
    const episode = entry.status === 'active' ? firstIncomplete(entry.episodes) : null
    if (episode) {
      return { track: entry.track, episode }
    }
  }
  return null
})

// --- Recherche et filtre, synchronises avec l'URL ------------------------------

const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const filter = computed<TrackFilter>(() => {
  const value = route.query.statut
  return TRACK_FILTERS.find((f) => f.value === value)?.value ?? 'all'
})

function updateUrl(patch: Readonly<Record<string, string | undefined>>) {
  return router.push({ query: { ...route.query, ...patch } })
}

const search = ref(query.value)
let timer: ReturnType<typeof setTimeout> | undefined

// Precedent / suivant : le champ suit l'URL.
watch(query, (value) => {
  search.value = value
})

watch(search, (value) => {
  clearTimeout(timer)
  if (value.trim() === query.value) {
    return
  }
  timer = setTimeout(() => updateUrl({ q: value.trim() || undefined }), SEARCH_DELAY_MS)
})

onBeforeUnmount(() => clearTimeout(timer))

function submitSearch() {
  clearTimeout(timer)
  updateUrl({ q: search.value.trim() || undefined })
}

function resetSearch() {
  clearTimeout(timer)
  search.value = ''
  updateUrl({ q: undefined, statut: undefined })
}

const needle = computed(() => normalize(query.value))

const matched = computed(() =>
  entries.value
    .map((entry) => ({ ...entry, matches: searchEpisodes(entry.episodes, needle.value) }))
    .filter(
      (entry) =>
        needle.value === '' || trackMatches(entry.track, needle.value) || entry.matches.length > 0,
    ),
)

const counts = computed<Readonly<Record<TrackFilter, number>>>(() => ({
  all: matched.value.length,
  active: matched.value.filter((e) => e.status === 'active').length,
  todo: matched.value.filter((e) => e.status === 'todo').length,
  completed: matched.value.filter((e) => e.status === 'completed').length,
}))

const visible = computed(() =>
  filter.value === 'all' ? matched.value : matched.value.filter((e) => e.status === filter.value),
)
</script>

<template>
  <div class="grid gap-10 py-10 sm:py-14">
    <TracksHeroSection :resume="resume" :load-error="loadError" />

    <TracksSearchSection
      v-model="search"
      :query="query"
      :filter="filter"
      :counts="counts"
      @submit="submitSearch"
      @reset="resetSearch"
      @filter="(value) => updateUrl({ statut: value === 'all' ? undefined : value })"
    />

    <TracksListSection
      :query="query"
      :entries="visible"
      :pending="status === 'pending' && !entries.length"
      :failed="!!loadError"
      :track-count="tracks.length"
      @reset="resetSearch"
    />
  </div>
</template>
