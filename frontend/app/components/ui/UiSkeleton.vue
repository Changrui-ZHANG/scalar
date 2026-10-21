<script setup lang="ts">
withDefaults(
  defineProps<{
    lines?: number
  }>(),
  {
    lines: 1,
  }
)
</script>

<template>
  <div class="flex flex-col gap-2.5" aria-hidden="true">
    <div
      v-for="i in lines"
      :key="i"
      class="bg-muted-foreground/15 h-4 w-full animate-pulse rounded"
      :style="{ width: lines > 1 && i === lines ? '60%' : '100%' }"
    />
  </div>
</template>
