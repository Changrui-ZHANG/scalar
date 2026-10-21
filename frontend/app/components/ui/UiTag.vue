<script setup lang="ts">
interface Props {
  tone: 'primary' | 'exercise' | 'muted' | 'success'
  icon?: string
}

const props = defineProps<Props>()

const toneClasses = computed(() => {
  switch (props.tone) {
    case 'primary':
      return 'text-primary bg-primary-soft'
    case 'exercise':
      return 'text-exercise bg-exercise-soft'
    case 'success':
      return 'text-success bg-success-soft'
    case 'muted':
    default:
      return 'text-text-muted bg-surface-muted'
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
      toneClasses,
    ]"
  >
    <Icon v-if="icon" :name="icon" class="size-3.5 shrink-0" />
    <slot />
  </span>
</template>
