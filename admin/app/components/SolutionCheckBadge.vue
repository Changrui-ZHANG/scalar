<script setup lang="ts">
defineProps<{ status: SolutionCheckStatus }>()

const COLORS = { not_checked: 'neutral', passed: 'success', failed: 'error' } as const
</script>

<template>
  <UBadge :color="COLORS[status]" variant="subtle" :label="SOLUTION_CHECK_LABELS[status]" />
</template>
