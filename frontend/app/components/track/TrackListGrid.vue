<script setup lang="ts">
// Grille des cartes de /parcours (specs-site.md § 5.1).
// Toute la carte mène à la vue d'ensemble ; le bouton, lui, mène à l'épisode courant.
import type { TrackCard } from '~/types/episode'

interface Props {
  cards: readonly TrackCard[]
}

const { cards } = defineProps<Props>()

// Étiquette de langage : « JavaScript », « TypeScript » ou « Leçons seulement ».
function languageLabel(card: TrackCard): string {
  if (card.view.track.programmingLanguage === 'javascript') return 'JavaScript'
  if (card.view.track.programmingLanguage === 'typescript') return 'TypeScript'
  return 'Leçons seulement'
}

function countLessons(card: TrackCard): number {
  let total = 0
  for (const chapter of card.view.chapters) {
    total += chapter.lessons.length
  }
  return total
}

function countExercises(card: TrackCard): number {
  let total = 0
  for (const chapter of card.view.chapters) {
    total += chapter.exercises.length
  }
  return total
}

// Adresse du bouton : l'épisode courant, sinon la vue d'ensemble.
function buttonPath(card: TrackCard): string {
  if (card.progress.current) {
    return card.progress.current.path
  }
  return `/parcours/${card.view.track.slug}`
}
</script>

<template>
  <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
    <div
      v-for="card in cards"
      :key="card.view.track.slug"
      class="rounded-panel border-border bg-surface hover:border-primary relative flex flex-col gap-4 border p-6.5"
    >
      <div class="flex items-center justify-between">
        <span
          class="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-xl text-lg font-bold"
        >
          {{ initials(card.view.track.name) }}
        </span>
        <span
          class="bg-surface-muted text-tag text-text-muted flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
        >
          <Icon
            v-if="card.view.track.programmingLanguage"
            name="lucide:code-xml"
            class="size-3.5"
          />
          <Icon v-else name="lucide:book-open" class="size-3.5" />
          {{ languageLabel(card) }}
        </span>
      </div>

      <!-- Le lien du titre s'étend à toute la carte (after:absolute) : un seul lien, pas de lien dans un lien -->
      <NuxtLink
        :to="`/parcours/${card.view.track.slug}`"
        class="font-display text-h2 text-text font-semibold tracking-tight after:absolute after:inset-0"
      >
        {{ card.view.track.name }}
      </NuxtLink>

      <p class="text-label text-text-muted leading-snug">{{ card.view.track.summary }}</p>

      <p class="text-small text-text-muted flex flex-wrap gap-3.5">
        <span>{{ countLabel(card.view.chapters.length, 'chapitre', 'chapitres') }}</span>
        <span>{{ countLabel(countLessons(card), 'leçon', 'leçons') }}</span>
        <span v-if="countExercises(card) > 0">
          {{ countLabel(countExercises(card), 'exercice', 'exercices') }}
        </span>
      </p>

      <p v-if="card.prerequisite" class="text-small text-text-muted flex items-center gap-1.5">
        <Icon name="lucide:corner-down-right" class="size-3.5" />
        Conseillé après {{ card.prerequisite.name }}
      </p>

      <div class="mt-auto flex flex-col gap-4">
        <UiProgressBar
          :value="card.progress.percent"
          :label="`Progression du parcours ${card.view.track.name}`"
        />
        <!-- relative z-10 : le bouton passe au-dessus du lien de la carte -->
        <div class="relative z-10">
          <UiButton
            dense
            :to="buttonPath(card)"
            :variant="card.progress.status === 'in_progress' ? 'primary' : 'secondary'"
            icon-right="lucide:arrow-right"
          >
            <template v-if="card.progress.status === 'in_progress'">Reprendre</template>
            <template v-else-if="card.progress.status === 'completed'">Revoir le parcours</template>
            <template v-else>Commencer</template>
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
