<script setup lang="ts">
/**
 * Tous les parcours : reprise, recherche, filtres par statut, cartes.
 * La recherche et le filtre vivent dans l'URL (`?q=…&statut=…`) : precedent
 * et suivant du navigateur les restaurent, resultats compris.
 */
type Filter = 'all' | TrackStatus

const FILTERS: readonly { readonly value: Filter; readonly label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'En cours' },
  { value: 'todo', label: 'Non commencés' },
  { value: 'completed', label: 'Terminés' },
]

/** Une entree d'historique par recherche, pas par touche frappee. */
const SEARCH_DELAY_MS = 350

useSeoMeta({
  title: 'Parcours — Scalar',
  description:
    'Chaque langage est un fil continu de leçons et d’exercices. Avancez dans l’ordre ou reprenez librement un épisode.',
})

const route = useRoute()
const router = useRouter()
const { languages, error: languagesError } = await useLanguages()
const { tracks, error: tracksError, status } = await useAllTracks(languages)
const progress = useProgress()

const loadError = computed(() => languagesError.value ?? tracksError.value)

const entries = computed(() =>
  languages.value.map((language, i) => {
    const track = tracks.value[i] ?? null
    const episodes = track ? buildEpisodes(track, progress.completedIn(language.slug)) : []
    return {
      language,
      index: i + 1,
      episodes,
      status: trackStatus(episodes, progress.isStarted(language.slug)),
    }
  }),
)

/** Premier episode non termine du premier parcours en cours. */
const resume = computed(() => {
  for (const entry of entries.value) {
    const episode = entry.status === 'active' ? firstIncomplete(entry.episodes) : null
    if (episode) {
      return { language: entry.language, episode }
    }
  }
  return null
})

// --- Recherche et filtre, synchronises avec l'URL ------------------------------

const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const filter = computed<Filter>(() => {
  const value = route.query.statut
  return FILTERS.find((f) => f.value === value)?.value ?? 'all'
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
        needle.value === '' ||
        languageMatches(entry.language, needle.value) ||
        entry.matches.length > 0,
    ),
)

const counts = computed<Readonly<Record<Filter, number>>>(() => ({
  all: matched.value.length,
  active: matched.value.filter((e) => e.status === 'active').length,
  todo: matched.value.filter((e) => e.status === 'todo').length,
  completed: matched.value.filter((e) => e.status === 'completed').length,
}))

const visible = computed(() =>
  filter.value === 'all' ? matched.value : matched.value.filter((e) => e.status === filter.value),
)

const resultLabel = computed(() => {
  const n = visible.value.length
  return n === 0
    ? 'Aucun parcours ne correspond'
    : `${n} ${n > 1 ? 'parcours correspondent' : 'parcours correspond'}`
})
</script>

<template>
  <div class="grid gap-10 py-10 sm:py-14">
    <header class="grid gap-3">
      <p class="eyebrow">Apprendre</p>
      <h1 class="text-4xl font-semibold sm:text-5xl">Vos parcours</h1>
      <p class="text-muted-foreground max-w-2xl text-lg">
        Chaque langage est un fil continu de leçons et d’exercices. Avancez dans l’ordre ou reprenez
        librement un épisode.
      </p>
    </header>

    <NextEpisodeCard
      v-if="resume"
      :eyebrow="`Continuer ${resume.language.label}`"
      :episode="resume.episode"
      action-label="Reprendre"
    />

    <p v-if="loadError" role="alert" class="alert-error">
      {{ apiErrorMessage(loadError, 'Les parcours sont injoignables pour l’instant.') }}
    </p>

    <section class="card grid gap-4 p-5 sm:p-6" aria-labelledby="recherche-titre">
      <h2 id="recherche-titre" class="font-sans text-lg font-bold">Rechercher dans les parcours</h2>
      <form role="search" class="flex flex-wrap gap-2" @submit.prevent="submitSearch">
        <label for="recherche" class="sr-only"
          >Rechercher un langage, une notion ou un exercice</label
        >
        <input
          id="recherche"
          v-model="search"
          type="search"
          enterkeyhint="search"
          placeholder="Un langage, une notion ou un exercice…"
          class="bg-background placeholder:text-muted-foreground min-h-11 min-w-0 flex-1 rounded-lg border px-4"
        >
        <button v-if="query" type="button" class="btn-secondary" @click="resetSearch">
          Effacer
        </button>
      </form>

      <div role="group" aria-label="Filtrer par statut" class="flex flex-wrap gap-2">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          :aria-pressed="filter === f.value"
          :disabled="counts[f.value] === 0 && filter !== f.value"
          class="min-h-11 rounded-full border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          :class="
            filter === f.value
              ? 'bg-brand text-brand-foreground border-transparent'
              : 'bg-surface hover:bg-foreground/5'
          "
          @click="updateUrl({ statut: f.value === 'all' ? undefined : f.value })"
        >
          {{ f.label }} <span class="tabular-nums">{{ counts[f.value] }}</span>
        </button>
      </div>
    </section>

    <section class="grid gap-6" aria-labelledby="liste-titre">
      <div class="grid gap-1">
        <h2 id="liste-titre" class="text-3xl font-semibold">
          {{ query ? `Résultats pour « ${query} »` : 'Tous les parcours' }}
        </h2>
        <p class="text-body-sm text-muted-foreground" aria-live="polite">{{ resultLabel }}</p>
      </div>

      <p v-if="status === 'pending' && !entries.length" class="text-muted-foreground">
        Chargement des parcours…
      </p>

      <EmptyState
        v-else-if="!loadError && !languages.length"
        title="Aucun parcours publié pour l’instant"
        description="Les premiers parcours arrivent bientôt."
      />

      <EmptyState
        v-else-if="!visible.length && languages.length"
        :title="query ? `Aucun résultat pour « ${query} »` : 'Aucun parcours dans ce filtre'"
        description="Essayez un autre mot : un langage, une notion comme « conditions », ou le titre d’un exercice."
      >
        <button type="button" class="btn-secondary" @click="resetSearch">
          Réinitialiser la recherche
        </button>
      </EmptyState>

      <ul v-else class="grid gap-5 md:grid-cols-2">
        <li v-for="entry in visible" :key="entry.language.slug" class="grid">
          <TrackCard
            :language="entry.language"
            :index="entry.index"
            :episodes="entry.episodes"
            :status="entry.status"
          >
            <div v-if="entry.matches.length" class="grid gap-2">
              <p class="text-body-sm font-semibold">
                {{ entry.matches.length }}
                {{ entry.matches.length > 1 ? 'épisodes correspondent' : 'épisode correspond' }}
              </p>
              <ul class="divide-y overflow-hidden rounded-xl border">
                <li v-for="episode in entry.matches" :key="episode.key">
                  <EpisodeRow :episode="episode" />
                </li>
              </ul>
            </div>
          </TrackCard>
        </li>
      </ul>
    </section>
  </div>
</template>
