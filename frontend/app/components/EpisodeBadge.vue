<script setup lang="ts">
/** Pastille Lecon / Exercice : le type se lit en toutes lettres, pas qu'a la couleur. */
defineProps<{ type: EpisodeType }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="type === 'lesson' ? 'bg-lesson-soft text-lesson' : 'bg-exercise-soft text-exercise'"
  >
    {{ EPISODE_TYPE_LABELS[type] }}
  </span>
</template>
