<script setup lang="ts">
interface Props {
  value: number
  label: string
}

const props = defineProps<Props>()

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(props.value))))
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
    class="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
  >
    <div
      class="h-full rounded-full bg-primary transition-all duration-300 ease-out"
      :style="{ width: `${clamped}%` }"
    />
  </div>
</template>
