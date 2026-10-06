<script setup lang="ts">
/** Le fil complet d'un parcours, groupe par chapitre ; rien n'est verrouille. */
const route = useRoute()
const languageSlug = computed(() => String(route.params.langage))

const { find, error: languagesError } = await useLanguages()
const language = computed(() => find(languageSlug.value))
if (!language.value && !languagesError.value) {
  throw createError({ statusCode: 404, statusMessage: 'Parcours inconnu', fatal: true })
}

const { track, episodes, error, status } = await useTrackEpisodes(() => languageSlug.value)

useSeoMeta({
  title: () => `Parcours ${language.value?.label ?? ''} — Scalar`,
  description: () => language.value?.summary ?? '',
})

const progress = computed(() => progressOf(episodes.value))
const next = computed(() => firstIncomplete(episodes.value))

const chapters = computed(() =>
  (track.value?.chapters ?? []).map((chapter) => {
    const own = episodes.value.filter((e) => e.chapterSlug === chapter.slug)
    return { ...chapter, episodes: own, status: trackStatus(own, false) }
  }),
)

const CHAPTER_LABELS: Readonly<Record<TrackStatus, string>> = {
  todo: 'À faire',
  active: 'En cours',
  completed: 'Terminé',
}

const NEXT_DESCRIPTIONS: Readonly<Record<EpisodeType, string>> = {
  lesson:
    'Découvrez la notion, observez un exemple, puis passez directement à sa mise en pratique.',
  exercise: 'Écrivez votre code, exécutez-le, puis vérifiez votre solution.',
}
</script>

<template>
  <div class="grid gap-10 py-10">
    <BreadcrumbTrail
      :items="[{ label: 'Parcours', to: '/parcours' }, { label: language?.label ?? 'Parcours' }]"
    />

    <p v-if="languagesError || error" role="alert" class="alert-error">
      {{ apiErrorMessage(languagesError ?? error, 'Le parcours est injoignable pour l’instant.') }}
    </p>

    <header class="grid gap-6 border-b pb-8 sm:grid-cols-[1fr_auto] sm:items-start">
      <div class="grid max-w-2xl gap-3">
        <p class="eyebrow">Parcours</p>
        <h1 class="text-4xl font-semibold sm:text-5xl">{{ language?.label }}</h1>
        <p class="text-muted-foreground text-lg">{{ language?.summary }}</p>
        <p v-if="language?.prerequisite" class="text-body-sm text-muted-foreground">
          <strong class="text-foreground">Prérequis recommandé :</strong> les bases de
          <NuxtLink :to="`/parcours/${language.prerequisite.slug}`" class="underline">
            {{ language.prerequisite.label }}</NuxtLink
          >. Ce parcours reste accessible librement.
        </p>
        <ProgressBar v-if="episodes.length" :progress="progress" class="mt-2" />
      </div>
      <NuxtLink to="/parcours" class="btn-secondary justify-self-start">Tous les parcours</NuxtLink>
    </header>

    <p v-if="status === 'pending' && !track" class="text-muted-foreground">
      Chargement du parcours…
    </p>

    <template v-else-if="track">
      <NextEpisodeCard
        v-if="next"
        eyebrow="À suivre"
        :episode="next"
        :action-label="progress.done === 0 ? 'Commencer le parcours' : 'Continuer le parcours'"
        :description="NEXT_DESCRIPTIONS[next.type]"
      />
      <section
        v-else-if="episodes.length"
        class="bg-success-soft text-success grid gap-2 rounded-2xl p-6 sm:p-8"
      >
        <h2 class="text-2xl font-semibold">Parcours terminé</h2>
        <p class="text-foreground">
          Bravo : tous les épisodes de {{ language?.label }} sont terminés. Revoyez librement
          n’importe quel épisode ci-dessous.
        </p>
      </section>

      <EmptyState
        v-if="!episodes.length"
        title="Ce parcours n’a pas encore d’épisode"
        description="Les premières leçons arrivent bientôt."
      />

      <section v-else class="grid gap-8" aria-labelledby="fil-titre">
        <div class="grid gap-1">
          <h2 id="fil-titre" class="text-3xl font-semibold">Le fil du parcours</h2>
          <p class="text-body-sm text-muted-foreground">
            Les leçons et les exercices se suivent dans un seul ordre.
          </p>
        </div>

        <section
          v-for="chapter in chapters"
          :id="chapter.slug"
          :key="chapter.slug"
          class="grid scroll-mt-24 gap-3"
          :aria-labelledby="`chapitre-${chapter.slug}`"
        >
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-body-sm text-muted-foreground">Chapitre {{ chapter.number }}</p>
              <h3 :id="`chapitre-${chapter.slug}`" class="font-display text-2xl font-semibold">
                {{ chapter.title }}
              </h3>
            </div>
            <StatusBadge
              v-if="chapter.episodes.length"
              :status="chapter.status"
              :label="CHAPTER_LABELS[chapter.status]"
            />
          </div>
          <ol v-if="chapter.episodes.length" class="card divide-y overflow-hidden">
            <li v-for="episode in chapter.episodes" :key="episode.key">
              <EpisodeRow :episode="episode" />
            </li>
          </ol>
          <p v-else class="text-body-sm text-muted-foreground">Ce chapitre arrive bientôt.</p>
        </section>
      </section>
    </template>
  </div>
</template>
