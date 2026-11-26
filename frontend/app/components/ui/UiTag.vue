<script setup lang="ts">
// Étiquette en pilule (specs-site.md § 3.4) : Leçon, Exercice, En cours, À commencer, Terminé.
interface Props {
  tone: 'primary' | 'exercise' | 'muted' | 'success'
  icon?: string
}

const { tone, icon = undefined } = defineProps<Props>()

// Couleur du texte et du fond pour chaque ton.
const toneClasses = {
  primary: 'bg-primary-soft text-primary',
  exercise: 'bg-exercise-soft text-exercise',
  muted: 'bg-surface-muted text-text-muted',
  success: 'bg-success-soft text-success',
}
</script>

<template>
  <span
    class="text-tag inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 font-semibold"
    :class="toneClasses[tone]"
  >
    <Icon v-if="icon" :name="icon" class="size-3 shrink-0" />
    <slot />
  </span>
</template>
