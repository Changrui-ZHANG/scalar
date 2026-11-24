<script setup lang="ts">
// Barre de progression : piste surface-muted, remplissage primary (specs-site.md § 3.2).
interface Props {
  value: number // pourcentage, de 0 à 100
  label: string // nom lu par les lecteurs d'écran
  tall?: boolean // 8 px (carte Reprendre, vue d'ensemble) au lieu de 6 px
}

const { value, label, tall = false } = defineProps<Props>()

// On garde la valeur entre 0 et 100, même si on reçoit autre chose.
const percent = computed(() => {
  if (value < 0) return 0
  if (value > 100) return 100
  return Math.round(value)
})
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
    class="bg-surface-muted w-full overflow-hidden rounded-full"
    :class="tall ? 'h-2' : 'h-1.5'"
  >
    <div class="bg-primary h-full rounded-full" :style="{ width: `${percent}%` }" />
  </div>
</template>
