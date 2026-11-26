<script setup lang="ts">
// Carte « Ensuite » en bas d'une leçon (specs-site.md § 6). Le clic marque la leçon
// terminée puis navigue : c'est la page qui s'en charge (événement continue).
import type { Episode } from '~/types/episode'

interface Props {
  next: Episode | null // null : dernier épisode du parcours
  completed: boolean // leçon déjà terminée : « Continuer »
}

const { next, completed } = defineProps<Props>()

const emit = defineEmits<{
  continue: []
}>()

const buttonLabel = computed(() => {
  if (completed) return 'Continuer'
  if (!next) return 'Terminer le parcours'
  if (next.kind === 'exercise') return 'Terminer la leçon et pratiquer'
  return 'Terminer la leçon et continuer'
})
</script>

<template>
  <div
    class="rounded-card border-border bg-surface mt-6 flex flex-col gap-4 border px-5 py-4.5 md:flex-row md:items-center md:justify-between"
  >
    <div class="flex flex-col gap-1">
      <p
        v-if="next && next.kind === 'exercise'"
        class="text-exercise flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase"
      >
        <Icon name="lucide:code-xml" class="size-3.5" />
        Ensuite · Exercice
      </p>
      <p
        v-else-if="next"
        class="text-primary flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase"
      >
        <Icon name="lucide:book-open" class="size-3.5" />
        Ensuite · Leçon
      </p>
      <p v-else class="text-text-muted text-xs font-bold tracking-wide uppercase">
        Fin du parcours
      </p>

      <h2 class="font-display text-text text-xl font-semibold">
        <template v-if="next">{{ next.title }}</template>
        <template v-else>Vous avez atteint la fin du parcours</template>
      </h2>
    </div>

    <div>
      <UiButton dense icon-right="lucide:arrow-right" @click="emit('continue')">
        {{ buttonLabel }}
      </UiButton>
    </div>
  </div>
</template>
