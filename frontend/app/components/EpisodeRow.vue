<script setup lang="ts">
/** Une ligne du fil : numero, type, titre et statut ; toute la ligne ouvre l'episode. */
defineProps<{ episode: TrackEpisode }>()
</script>

<template>
  <NuxtLink
    :to="episode.route"
    class="hover:bg-foreground/5 flex min-h-16 items-center gap-4 px-4 py-3 sm:px-6"
  >
    <span class="font-display text-muted-foreground w-8 shrink-0 text-xl tabular-nums">
      {{ padNumber(episode.number) }}
    </span>
    <span class="grid min-w-0 flex-1 justify-items-start gap-1">
      <EpisodeBadge :type="episode.type" />
      <span class="font-semibold">{{ episode.title }}</span>
    </span>
    <span
      class="text-body-sm shrink-0"
      :class="{
        'text-success font-semibold': episode.status === 'completed',
        'text-brand font-semibold': episode.status === 'current',
        'text-muted-foreground': episode.status === 'todo',
      }"
    >
      {{ EPISODE_STATUS_LABELS[episode.status]
      }}<span v-if="episode.status === 'current'" aria-hidden="true"> →</span>
    </span>
  </NuxtLink>
</template>
