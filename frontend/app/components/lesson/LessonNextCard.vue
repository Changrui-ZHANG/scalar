<script setup lang="ts">
import type { Episode } from '~/types/episode'

interface Props {
  next: Episode | null
  completed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  continue: []
}>()

const buttonLabel = computed(() => {
  if (props.completed) {
    return 'Continuer'
  }
  if (!props.next) {
    return 'Terminer le parcours'
  }
  return props.next.kind === 'exercise'
    ? 'Terminer la leçon et pratiquer'
    : 'Terminer la leçon et continuer'
})
</script>

<template>
  <div class="mt-12 rounded-[14px] border border-border bg-surface p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs font-bold uppercase tracking-wider text-text-muted">
        Ensuite · {{ next ? (next.kind === 'exercise' ? 'Exercice' : 'Leçon') : 'Fin' }}
      </span>
      <h2 class="font-display text-xl md:text-2xl font-bold text-text">
        {{ next ? next.title : 'Vous avez atteint la fin du parcours' }}
      </h2>
      <p v-if="next?.excerpt" class="text-sm text-text-muted line-clamp-1">
        {{ next.excerpt }}
      </p>
    </div>

    <UiButton
      variant="primary"
      icon="lucide:arrow-right"
      @click="emit('continue')"
    >
      {{ buttonLabel }}
    </UiButton>
  </div>
</template>
