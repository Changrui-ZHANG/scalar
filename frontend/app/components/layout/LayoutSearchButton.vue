<script setup lang="ts">
withDefaults(
  defineProps<{
    shortcutLabel?: string
  }>(),
  {
    shortcutLabel: 'Ctrl K',
  },
)

defineEmits<{
  openSearch: []
}>()
</script>

<template>
  <button
    type="button"
    aria-label="Rechercher"
    class="border-border bg-surface hover:bg-surface-muted inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-sm transition-colors md:min-h-9 md:min-w-9 xl:px-3 cursor-pointer"
    @click="$emit('openSearch')"
  >
    <Icon name="lucide:search" class="size-4 shrink-0 text-text-muted" aria-hidden="true" />
    <span class="hidden text-sm font-medium xl:inline">Rechercher</span>
    <kbd
      v-if="shortcutLabel"
      class="border-border text-text-muted hidden rounded border px-1.5 py-0.5 font-mono text-[11px] xl:inline-flex"
    >
      {{ shortcutLabel }}
    </kbd>
  </button>
</template>
