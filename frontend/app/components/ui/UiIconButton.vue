<script setup lang="ts">
interface Props {
  icon: string
  label: string
  bordered?: boolean
  to?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  bordered: false,
  to: undefined,
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-[10px] transition-colors',
  'size-9 md:size-9 min-w-9 min-h-9 md:min-w-9 md:min-h-9 max-md:size-11 max-md:min-w-11 max-md:min-h-11',
  props.bordered ? 'border border-border bg-surface hover:bg-surface-muted text-text' : 'hover:bg-surface-muted text-text-muted hover:text-text',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  props.disabled ? 'opacity-45 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
])

function handleClick(e: MouseEvent) {
  if (props.disabled) {
    e.preventDefault()
    return
  }
  emit('click', e)
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :aria-label="label"
    :title="label"
    :class="classes"
    @click="handleClick"
  >
    <Icon :name="icon" class="size-5 shrink-0" />
  </NuxtLink>
  <button
    v-else
    type="button"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    :class="classes"
    @click="handleClick"
  >
    <Icon :name="icon" class="size-5 shrink-0" />
  </button>
</template>
