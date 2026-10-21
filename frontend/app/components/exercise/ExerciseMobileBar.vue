<script setup lang="ts">
import type { Episode } from '~/types/episode'
import type { RunPending } from '~/types/exercise'

interface Props {
  pending: RunPending
  passed: boolean
  next: Episode | null
  overviewPath: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  run: []
  verify: []
}>()

const destination = computed(() => props.next?.path ?? props.overviewPath)
const nextLabel = computed(() => (props.next ? `Suivant : ${props.next.title}` : 'Parcours terminé'))
</script>

<template>
  <div class="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t border-border bg-surface p-3">
    <!-- Après réussite : bouton Suivant -->
    <UiButton
      v-if="passed"
      :to="destination"
      variant="primary"
      class="flex-1"
      icon="lucide:arrow-right"
    >
      {{ nextLabel }}
    </UiButton>

    <!-- Avant réussite : Exécuter + Vérifier -->
    <template v-else>
      <UiButton
        variant="secondary"
        dense
        icon="lucide:play"
        :disabled="pending !== null"
        :loading="pending === 'run'"
        loading-label="Exécution…"
        @click="emit('run')"
      >
        Exécuter
      </UiButton>

      <UiButton
        variant="primary"
        dense
        icon="lucide:check-check"
        class="flex-1"
        :disabled="pending !== null"
        :loading="pending === 'verify'"
        loading-label="Vérification…"
        @click="emit('verify')"
      >
        Vérifier
      </UiButton>
    </template>
  </div>
</template>
