<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { label, cycle } = useTheme()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="inline-flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface text-text hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
    @click="cycle"
  >
    <Icon name="lucide:sun-moon" class="size-5" />
  </button>
</template>
