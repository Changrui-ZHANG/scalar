<script setup lang="ts">
/** Progression calculee, jamais ecrite en dur : episodes termines sur le total. */
defineProps<{ progress: TrackProgress }>()
</script>

<template>
  <div class="grid gap-2">
    <div class="text-body-sm flex justify-between gap-4">
      <span class="text-muted-foreground">
        {{ progress.done }} {{ progress.done > 1 ? 'épisodes terminés' : 'épisode terminé' }} sur
        {{ progress.total }}
      </span>
      <span class="font-semibold tabular-nums">{{ progress.percent }} %</span>
    </div>
    <div
      role="progressbar"
      :aria-valuenow="progress.percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Progression : ${progress.percent} %`"
      class="bg-foreground/10 h-2 overflow-hidden rounded-full"
    >
      <div
        class="bg-success h-full rounded-full transition-[width] duration-500"
        :style="{ width: `${progress.percent}%` }"
      />
    </div>
  </div>
</template>
