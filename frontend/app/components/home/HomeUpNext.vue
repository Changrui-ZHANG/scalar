<script setup lang="ts">
import type { Episode } from '~/types/episode'

interface Props {
  episodes: readonly Episode[]
}

defineProps<Props>()
</script>

<template>
  <div v-if="episodes.length > 0" class="flex flex-col gap-3">
    <span class="text-xs font-bold uppercase tracking-wider text-text-muted">
      Ensuite dans le parcours
    </span>

    <div class="flex flex-col gap-2">
      <NuxtLink
        v-for="ep in episodes"
        :key="ep.key"
        :to="ep.path"
        class="flex items-center justify-between gap-3 rounded-[10px] p-2 hover:bg-surface-muted transition-colors text-sm"
      >
        <div class="flex items-center gap-2.5 truncate">
          <Icon
            :name="ep.kind === 'lesson' ? 'lucide:book-open' : 'lucide:code-xml'"
            :class="ep.kind === 'lesson' ? 'text-primary' : 'text-exercise'"
            class="size-4 shrink-0"
          />
          <span class="truncate text-text font-medium">{{ ep.title }}</span>
        </div>

        <span class="shrink-0 text-xs text-text-muted">
          {{ ep.kind === 'lesson' ? 'Leçon' : 'Exercice' }} · ch. {{ ep.chapter.number }}
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
