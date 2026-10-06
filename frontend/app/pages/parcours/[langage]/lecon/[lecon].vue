<script setup lang="ts">
/**
 * Une lecon, a sa place dans le fil du parcours. Elle n'est terminee que sur
 * action explicite : l'ouvrir ne suffit pas.
 */
const route = useRoute()
const languageSlug = computed(() => String(route.params.langage))
const lessonSlug = computed(() => String(route.params.lecon))

const { data, error } = await useFetch<ApiResponse<LessonDetail>>(
  () => apiUrl(`/lessons/${seg(languageSlug.value)}/${seg(lessonSlug.value)}`),
  { key: () => `lesson-${languageSlug.value}-${lessonSlug.value}` },
)
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Leçon introuvable', fatal: true })
}

const lesson = computed(() => data.value?.data ?? null)
const { episodes, progress } = await useTrackEpisodes(() => languageSlug.value)

const key = computed(() => lessonKey(lessonSlug.value))
/** Nul pour une lecon hors du fil (ancien lien de Connaissance) : elle reste lisible. */
const episode = computed(() => episodes.value.find((e) => e.key === key.value) ?? null)
const next = computed(() => nextEpisode(episodes.value, key.value))
const completed = computed(() => episode.value?.status === 'completed')
const trackRoute = computed(() => `/parcours/${languageSlug.value}`)

onMounted(() => progress.start(languageSlug.value))

/** Ce que la lecon aborde : ses intertitres, tires du contenu lui-meme. */
const objectives = computed(() =>
  (lesson.value?.content ?? '')
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim()),
)

const reviewedOn = computed(() =>
  lesson.value?.reviewedAt
    ? new Date(lesson.value.reviewedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })
    : null,
)

const crumbs = computed(() => {
  const head = [
    { label: 'Parcours', to: '/parcours' },
    { label: lesson.value?.section.label ?? 'Parcours', to: trackRoute.value },
  ]
  const e = episode.value
  if (!e) {
    return [...head, { label: lesson.value?.title ?? 'Leçon' }]
  }
  return [
    ...head,
    {
      label: `Chapitre ${e.chapterNumber} — ${e.chapterTitle}`,
      to: `${trackRoute.value}#${e.chapterSlug}`,
    },
    { label: `${padNumber(e.number)} · Leçon — ${e.title}` },
  ]
})

const actionLabel = computed(() => {
  const n = next.value
  if (completed.value) {
    return n?.type === 'exercise'
      ? 'Reprendre l’exercice'
      : n
        ? 'Passer à l’épisode suivant'
        : 'Retour au fil'
  }
  return n?.type === 'exercise'
    ? 'Terminer et passer à l’exercice'
    : n
      ? 'Terminer et passer à la leçon suivante'
      : 'Terminer le parcours'
})

async function finish() {
  progress.complete(languageSlug.value, key.value)
  await navigateTo(next.value?.route ?? trackRoute.value)
}

useSeoMeta({
  title: () => `${lesson.value?.title ?? 'Leçon'} — ${lesson.value?.section.label ?? ''} — Scalar`,
  description: () => lesson.value?.summary.replaceAll('`', '') ?? '',
})
</script>

<template>
  <article class="grid max-w-3xl gap-8 py-10">
    <BreadcrumbTrail :items="crumbs" />

    <p v-if="error" role="alert" class="alert-error">
      {{ apiErrorMessage(error, 'La leçon est injoignable pour l’instant.') }}
    </p>

    <template v-if="lesson">
      <header class="grid justify-items-start gap-3">
        <EpisodeBadge type="lesson" />
        <p v-if="episode" class="text-body-sm text-muted-foreground">
          Épisode {{ padNumber(episode.number) }} sur {{ episodes.length }} · Chapitre
          {{ episode.chapterNumber }}
          <template v-if="completed">
            · <span class="text-success font-semibold">Terminée</span></template
          >
        </p>
        <h1 class="text-4xl font-semibold sm:text-5xl">{{ lesson.title }}</h1>
        <RichText :source="lesson.summary" class="text-muted-foreground text-lg" />
        <p v-if="reviewedOn" class="text-body-sm text-muted-foreground">Relu le {{ reviewedOn }}</p>
      </header>

      <section
        v-if="objectives.length"
        class="bg-lesson-soft border-lesson/20 grid gap-2 rounded-2xl border p-6"
        aria-labelledby="objectif-titre"
      >
        <h2 id="objectif-titre" class="eyebrow text-lesson font-sans">
          Ce que vous allez apprendre
        </h2>
        <ul class="grid list-disc gap-1 pl-5 font-semibold">
          <li v-for="item in objectives" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="grid gap-4" aria-labelledby="principe-titre">
        <h2 id="principe-titre" class="text-2xl font-semibold">Comprendre le principe</h2>
        <RichText :source="lesson.content" />
      </section>

      <section
        v-if="episode"
        class="bg-exercise-soft border-exercise/20 grid gap-4 rounded-2xl border p-6 sm:grid-cols-[1fr_auto] sm:items-center"
        aria-labelledby="pratique-titre"
      >
        <div class="grid justify-items-start gap-1">
          <h2 id="pratique-titre" class="eyebrow text-exercise font-sans">Mettre en pratique</h2>
          <template v-if="next">
            <EpisodeBadge :type="next.type" class="mt-1" />
            <p class="text-xl font-semibold">
              Épisode {{ padNumber(next.number) }} — {{ next.title }}
            </p>
            <p class="text-body-sm text-muted-foreground">
              {{
                next.type === 'exercise'
                  ? 'Mettez immédiatement cette notion en pratique.'
                  : 'Poursuivez avec la notion suivante.'
              }}
            </p>
          </template>
          <p v-else class="text-xl font-semibold">Dernier épisode du parcours.</p>
        </div>
        <button type="button" class="btn-primary justify-self-start" @click="finish">
          {{ actionLabel }} <span aria-hidden="true">→</span>
        </button>
      </section>

      <div class="border-t pt-6">
        <NuxtLink :to="trackRoute" class="btn-secondary">
          <span aria-hidden="true">←</span> Retour au fil {{ lesson.section.label }}
        </NuxtLink>
      </div>
    </template>
  </article>
</template>
