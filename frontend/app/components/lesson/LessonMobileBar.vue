<script setup lang="ts">
import type { Episode } from '~/types/episode'

interface Props {
  previous: Episode | null
  next: Episode | null
  completed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  continue: []
}>()

const buttonLabel = computed(() => {
  if (!props.next) {
    return 'Terminer le parcours'
  }
  return props.next.kind === 'exercise'
    ? `Pratiquer : ${props.next.title}`
    : `Continuer : ${props.next.title}`
})
</script>

<template>
  <div class="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t border-border bg-surface p-3">
    <!-- Précédent (44x44) -->
    <UiIconButton
      v-if="previous"
      :to="previous.path"
      icon="lucide:arrow-left"
      label="Épisode précédent"
      bordered
    />
    <div v-else class="size-11" />

    <!-- Suivant pleine largeur -->
    <UiButton
      variant="primary"
      class="flex-1 truncate"
      @click="emit('continue')"
    >
      <span class="truncate">{{ buttonLabel }}</span>
    </UiButton>
  </div>
</template>
