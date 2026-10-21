<script setup lang="ts">
import type { TrackCard } from '~/types/episode'

interface Props {
  card: TrackCard
}

const props = defineProps<Props>()

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

const distinctLevels = computed(() => {
  const set = new Set(props.card.view.chapters.map((c) => c.level))
  return set.size
})

const totalLessons = computed(() => {
  return props.card.view.chapters.reduce((acc, c) => acc + c.lessons.length, 0)
})

const totalExercises = computed(() => {
  return props.card.view.chapters.reduce((acc, c) => acc + c.exercises.length, 0)
})

const buttonLabel = computed(() => {
  if (props.card.progress.status === 'in_progress' && props.card.progress.current) {
    return `Reprendre : ${props.card.progress.current.title}`
  }
  if (props.card.progress.current) {
    return `Commencer : ${props.card.progress.current.title}`
  }
  return 'Commencer'
})
</script>

<template>
  <div class="flex flex-col gap-6 rounded-[14px] border border-border bg-surface p-6 md:p-8 xl:w-90 xl:sticky xl:top-24">
    <div class="flex items-center gap-4">
      <span class="flex size-[52px] shrink-0 items-center justify-center rounded-2xl bg-primary-soft font-display text-2xl font-bold text-primary">
        {{ getInitials(card.view.track.name) }}
      </span>

      <div class="flex flex-col">
        <h1 class="font-display text-2xl md:text-3xl font-bold text-text leading-tight">
          {{ card.view.track.name }}
        </h1>
      </div>
    </div>

    <p class="text-sm md:text-base text-text-muted leading-relaxed">
      {{ card.view.track.summary }}
    </p>

    <!-- Progression -->
    <div class="flex flex-col gap-2">
      <UiProgressBar
        :value="card.progress.percent"
        :label="`Progression ${card.view.track.name}`"
      />
      <span class="text-xs text-text-muted">
        {{ card.progress.done }} épisodes sur {{ card.progress.total }} · {{ card.progress.percent }} %
      </span>
    </div>

    <!-- Action principale -->
    <UiButton
      v-if="card.progress.current"
      :to="card.progress.current.path"
      variant="primary"
      :icon="card.progress.status === 'in_progress' ? 'lucide:arrow-right' : 'lucide:play'"
    >
      {{ buttonLabel }}
    </UiButton>

    <!-- Faits essentiels -->
    <div class="border-t border-border pt-6 flex flex-col gap-2.5 text-xs text-text-muted">
      <div class="flex items-center gap-2">
        <Icon name="lucide:layers" class="size-4 text-text-muted" />
        <span>{{ card.view.chapters.length }} chapitres · {{ distinctLevels }} niveaux</span>
      </div>
      <div class="flex items-center gap-2">
        <Icon name="lucide:book-open" class="size-4 text-primary" />
        <span>{{ totalLessons }} leçons</span>
      </div>
      <div v-if="card.view.track.programmingLanguage" class="flex items-center gap-2">
        <Icon name="lucide:code-xml" class="size-4 text-exercise" />
        <span>{{ totalExercises }} exercices corrigés automatiquement</span>
      </div>
      <div v-else class="flex items-center gap-2 italic">
        <span>Leçons seulement : pas de langage de programmation, donc pas d'exercice</span>
      </div>

      <!-- Prérequis conseillé -->
      <div v-if="card.prerequisite" class="mt-2 border-t border-border/50 pt-2 text-xs">
        Conseillé après
        <NuxtLink :to="`/parcours/${card.prerequisite.slug}`" class="font-semibold text-primary hover:underline">
          {{ card.prerequisite.name }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
