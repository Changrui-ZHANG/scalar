<script setup lang="ts">
// Question à choix du positionnement : une seule réponse, boutons radio.
import type { PublicQuestion } from '~/types/questionnaire'

interface Props {
  question: PublicQuestion
  selected: number | undefined
}

const { question, selected } = defineProps<Props>()

const emit = defineEmits<{
  choose: [optionId: number]
}>()
</script>

<template>
  <fieldset class="flex flex-col gap-3">
    <legend class="sr-only">{{ question.title }}</legend>
    <label
      v-for="option in question.options"
      :key="option.id"
      class="rounded-control flex cursor-pointer items-center gap-3 border px-4 py-3.5 transition-colors"
      :class="
        selected === option.id
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-surface hover:bg-surface-muted'
      "
    >
      <input
        type="radio"
        :name="`question-${question.id}`"
        :value="option.id"
        :checked="selected === option.id"
        class="accent-primary size-4 shrink-0"
        @change="emit('choose', option.id)"
      >
      <ContentRichText :source="option.label" :language="null" variant="compact" />
    </label>
  </fieldset>
</template>
