<script setup lang="ts">
/** Statut d'un parcours ou d'un chapitre : libelle explicite, couleur en appui. */
defineProps<{ status: TrackStatus; label?: string }>()

const TONES: Readonly<Record<TrackStatus, string>> = {
  completed: 'bg-success-soft text-success',
  active: 'bg-exercise-soft text-exercise',
  todo: 'bg-foreground/5 text-muted-foreground',
}
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold"
    :class="TONES[status]"
  >
    {{ label ?? TRACK_STATUS_LABELS[status] }}
  </span>
</template>
