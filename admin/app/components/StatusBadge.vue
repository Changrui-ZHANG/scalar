<script setup lang="ts">
defineProps<{ status: ContentStatus }>()

const COLORS = { draft: 'neutral', published: 'success', archived: 'warning' } as const
</script>

<template>
  <UBadge :color="COLORS[status]" variant="subtle" :label="STATUS_LABELS[status]" />
</template>
