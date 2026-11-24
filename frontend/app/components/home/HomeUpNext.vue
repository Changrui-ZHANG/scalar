<script setup lang="ts">
// Colonne « Ensuite dans le parcours » de la carte Reprendre (specs-site.md § 4.2).
import type { Episode } from '~/types/episode'

interface Props {
  episodes: readonly Episode[] // 4 au plus
}

const { episodes } = defineProps<Props>()
</script>

<template>
  <div class="bg-surface-muted flex flex-col gap-3 p-6 md:p-7 lg:w-95">
    <p class="text-text-muted text-xs font-bold tracking-wide uppercase">
      Ensuite dans le parcours
    </p>

    <NuxtLink
      v-for="episode in episodes"
      :key="episode.key"
      :to="episode.path"
      class="rounded-row flex items-center gap-3 py-2 hover:opacity-80"
    >
      <span class="bg-surface flex size-7.5 shrink-0 items-center justify-center rounded-lg">
        <Icon
          v-if="episode.kind === 'lesson'"
          name="lucide:book-open"
          class="text-primary size-4"
        />
        <Icon v-else name="lucide:code-xml" class="text-exercise size-4" />
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="text-label text-text truncate font-semibold">{{ episode.title }}</span>
        <span class="text-meta text-text-muted">
          <template v-if="episode.kind === 'lesson'">Leçon</template>
          <template v-else>Exercice</template>
          · chapitre {{ episode.chapter.number }}
        </span>
      </span>
    </NuxtLink>
  </div>
</template>
