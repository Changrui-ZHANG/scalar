<script setup lang="ts">
// Barre basse de l'exercice sur mobile (specs-site.md § 7.4) : Exécuter et Vérifier,
// remplacés par « Suivant : titre » après une réussite.
import type { Episode } from '~/types/episode'
import type { RunPending } from '~/types/exercise'

interface Props {
  pending: RunPending
  passed: boolean
  next: Episode | null
  overviewPath: string
}

const { pending, passed, next, overviewPath } = defineProps<Props>()

const emit = defineEmits<{
  run: []
  verify: []
}>()
</script>

<template>
  <div
    class="border-border bg-surface flex shrink-0 gap-2.5 border-t px-3.5 pt-2.5 pb-6.5 md:hidden"
  >
    <template v-if="passed">
      <UiButton v-if="next" class="flex-1" :to="next.path" icon-right="lucide:arrow-right">
        Suivant : {{ next.title }}
      </UiButton>
      <UiButton v-else class="flex-1" :to="overviewPath" icon-right="lucide:arrow-right"
        >Parcours terminé</UiButton
      >
    </template>
    <template v-else>
      <UiButton
        class="flex-1"
        variant="secondary"
        icon="lucide:play"
        :disabled="pending !== null"
        :loading="pending === 'run'"
        loading-label="Exécution…"
        @click="emit('run')"
      >
        Exécuter
      </UiButton>
      <UiButton
        class="flex-1"
        icon="lucide:check-check"
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
