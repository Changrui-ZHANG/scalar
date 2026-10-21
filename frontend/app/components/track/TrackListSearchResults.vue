<script setup lang="ts">
import type { SearchResult } from '~/types/search'
import { SEARCH_KIND_ICONS } from '~/utils/search'

interface Props {
  results: readonly SearchResult[]
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-4">
    <NuxtLink
      v-for="r in results"
      :key="r.entry.path"
      :to="r.entry.path"
      class="flex items-center justify-between gap-4 rounded-[10px] p-3 hover:bg-surface-muted transition-colors text-sm"
    >
      <div class="flex items-center gap-3 truncate">
        <Icon
          :name="SEARCH_KIND_ICONS[r.entry.kind]"
          class="size-4 shrink-0 text-text-muted"
        />
        <span class="font-semibold text-text truncate">
          {{ r.entry.title }}
        </span>
      </div>

      <div class="flex items-center gap-2 text-xs text-text-muted shrink-0">
        <span>{{ r.entry.trackName }}</span>
        <span v-if="r.entry.chapterNumber !== null">· ch. {{ r.entry.chapterNumber }}</span>
      </div>
    </NuxtLink>
  </div>
</template>
