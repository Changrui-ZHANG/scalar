<script setup lang="ts">
import type { SearchResult } from '~/types/search'
import { SEARCH_KIND_ICONS } from '~/utils/search'

interface Props {
  results: readonly SearchResult[]
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-card border-border bg-surface flex flex-col gap-2 border p-4">
    <NuxtLink
      v-for="r in results"
      :key="r.entry.path"
      :to="r.entry.path"
      class="rounded-row hover:bg-surface-muted flex items-center justify-between gap-4 p-3 text-sm transition-colors"
    >
      <div class="flex items-center gap-3 truncate">
        <Icon :name="SEARCH_KIND_ICONS[r.entry.kind]" class="text-text-muted size-4 shrink-0" />
        <span class="text-text truncate font-semibold">
          {{ r.entry.title }}
        </span>
      </div>

      <div class="text-text-muted flex shrink-0 items-center gap-2 text-xs">
        <span>{{ r.entry.trackName }}</span>
        <span v-if="r.entry.chapterNumber !== null">· chapitre {{ r.entry.chapterNumber }}</span>
      </div>
    </NuxtLink>
  </div>
</template>
