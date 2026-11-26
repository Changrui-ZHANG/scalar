<script setup lang="ts">
// Résultat du positionnement : niveau, score, parcours conseillé et remarques.
import { CHAPTER_LEVEL_LABELS } from '@scalar/shared/labels'
import type { QuestionnaireResult } from '~/types/questionnaire'

interface Props {
  result: QuestionnaireResult
}

const { result } = defineProps<Props>()

const emit = defineEmits<{
  restart: []
}>()

// Lien vers le chapitre de départ, dans la vue d'ensemble du parcours conseillé.
const startLink = computed(() => {
  if (!result.track) return null
  const anchor = result.startChapter ? `#${result.startChapter.slug}` : ''
  return `/parcours/${result.track.slug}${anchor}`
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2">
      <span class="text-small text-primary font-semibold">Votre résultat</span>
      <h1 class="font-display text-title text-text font-semibold md:text-4xl">
        Niveau {{ CHAPTER_LEVEL_LABELS[result.level].toLowerCase() }}
      </h1>
      <p class="text-lede text-text-muted">Score : {{ Math.round(result.score) }} sur 100.</p>
    </div>

    <div
      v-if="result.track"
      class="border-border bg-surface rounded-card flex flex-col gap-4 border p-6"
    >
      <h2 class="font-display text-text text-xl font-semibold">
        Parcours conseillé : {{ result.track.name }}
      </h2>
      <p v-if="result.startChapter" class="text-body text-text-muted">
        Commencez au chapitre « {{ result.startChapter.title }} ».
      </p>
      <div>
        <UiButton v-if="startLink" :to="startLink" icon-right="lucide:arrow-right">
          Commencer {{ result.track.name }}
        </UiButton>
      </div>
    </div>

    <ul v-if="result.feedback.length > 0" class="flex flex-col gap-2.5">
      <li
        v-for="line in result.feedback"
        :key="line"
        class="text-body text-text flex items-start gap-3"
      >
        <Icon name="lucide:info" class="text-primary mt-1 size-4.5 shrink-0" />
        <span>{{ line }}</span>
      </li>
    </ul>

    <div v-if="result.exercises.length > 0" class="flex flex-col gap-2">
      <span class="text-ui text-text font-semibold">Exercices</span>
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="exercise in result.exercises"
          :key="exercise.questionId"
          class="text-ui flex items-center gap-2.5"
        >
          <Icon
            :name="exercise.passed ? 'lucide:circle-check' : 'lucide:circle-x'"
            class="size-4 shrink-0"
            :class="exercise.passed ? 'text-success' : 'text-text-muted'"
          />
          <span class="text-text">{{ exercise.title }}</span>
          <span class="text-text-muted">
            {{ exercise.passedCases }} cas sur {{ exercise.totalCases }}
          </span>
        </li>
      </ul>
    </div>

    <div>
      <UiButton variant="secondary" icon="lucide:rotate-ccw" @click="emit('restart')">
        Recommencer le test
      </UiButton>
    </div>
  </div>
</template>
