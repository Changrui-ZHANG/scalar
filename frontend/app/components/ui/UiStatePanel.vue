<script setup lang="ts">
interface Props {
  icon: string
  title: string
  text: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
    <div class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-text-muted">
      <Icon :name="icon" class="size-7" />
    </div>
    <h2 class="mb-2 text-xl font-bold font-display text-text">
      {{ title }}
    </h2>
    <p class="mb-6 text-sm text-text-muted leading-relaxed">
      {{ text }}
    </p>
    <div v-if="$slots.actions" class="flex flex-wrap items-center justify-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
