<script setup lang="ts">
// Colonne de présentation de la vue d'ensemble d'un parcours (specs-site.md § 5.2).
import type { TrackCard } from '~/types/episode'

interface Props {
  card: TrackCard
}

const { card } = defineProps<Props>()

// Nombre de niveaux différents parmi les chapitres (Débutant, Intermédiaire…).
const levelCount = computed(() => {
  const levels: string[] = []
  for (const chapter of card.view.chapters) {
    if (!levels.includes(chapter.level)) {
      levels.push(chapter.level)
    }
  }
  return levels.length
})

const lessonCount = computed(() => {
  let total = 0
  for (const chapter of card.view.chapters) {
    total += chapter.lessons.length
  }
  return total
})

const exerciseCount = computed(() => {
  let total = 0
  for (const chapter of card.view.chapters) {
    total += chapter.exercises.length
  }
  return total
})

// « Reprendre : épisode », « Commencer : premier épisode » ou « Revoir le parcours » (§ 5.2, § 9).
const buttonLabel = computed(() => {
  const current = card.progress.current
  if (!current) return ''
  if (card.progress.status === 'completed') return 'Revoir le parcours'
  if (card.progress.status === 'in_progress') return `Reprendre : ${current.title}`
  return `Commencer : ${current.title}`
})
</script>

<template>
  <div class="flex flex-col gap-4 xl:sticky xl:top-24 xl:w-90 xl:shrink-0">
    <span
      class="rounded-card bg-primary-soft text-lede text-primary flex size-13 items-center justify-center font-bold"
    >
      {{ initials(card.view.track.name) }}
    </span>

    <h1 class="font-display text-text xl:text-h1 text-4xl font-semibold tracking-tight">
      {{ card.view.track.name }}
    </h1>

    <p class="text-body text-text-muted leading-snug">{{ card.view.track.summary }}</p>

    <div class="flex flex-col gap-2">
      <UiProgressBar
        tall
        :value="card.progress.percent"
        :label="`Progression du parcours ${card.view.track.name}`"
      />
      <p class="text-small text-text-muted">
        {{ countLabel(card.progress.done, 'épisode', 'épisodes') }} sur {{ card.progress.total }} ·
        {{ card.progress.percent }} %
      </p>
    </div>

    <div v-if="card.progress.current">
      <UiButton :to="card.progress.current.path" icon-right="lucide:arrow-right">
        {{ buttonLabel }}
      </UiButton>
    </div>

    <ul class="text-ui text-text-muted flex flex-col gap-2 pt-2">
      <li class="flex items-center gap-2">
        <Icon name="lucide:layers" class="size-4 shrink-0" />
        {{ countLabel(card.view.chapters.length, 'chapitre', 'chapitres') }} ·
        {{ countLabel(levelCount, 'niveau', 'niveaux') }}
      </li>
      <li class="flex items-center gap-2">
        <Icon name="lucide:book-open" class="size-4 shrink-0" />
        {{ countLabel(lessonCount, 'leçon', 'leçons') }}
      </li>
      <li v-if="card.view.track.programmingLanguage" class="flex items-center gap-2">
        <Icon name="lucide:code-xml" class="size-4 shrink-0" />
        {{ countLabel(exerciseCount, 'exercice corrigé', 'exercices corrigés') }} automatiquement
      </li>
      <li v-else class="flex items-start gap-2">
        <Icon name="lucide:info" class="mt-0.5 size-4 shrink-0" />
        Leçons seulement : pas de langage de programmation, donc pas d’exercice
      </li>
      <li v-if="card.prerequisite" class="flex items-center gap-2">
        <Icon name="lucide:corner-down-right" class="size-4 shrink-0" />
        <span>
          Conseillé après
          <NuxtLink
            :to="`/parcours/${card.prerequisite.slug}`"
            class="text-primary font-semibold hover:underline"
          >
            {{ card.prerequisite.name }}
          </NuxtLink>
        </span>
      </li>
    </ul>
  </div>
</template>
