<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  to?: string
  icon?: string
  dense?: boolean
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  to: undefined,
  icon: undefined,
  dense: false,
  loading: false,
  loadingLabel: 'Chargement…',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isDisabled = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150',
  props.dense
    ? 'h-10 px-3.5 text-sm rounded-[10px]'
    : 'h-11 px-5 text-base rounded-[12px]',
  props.variant === 'primary'
    ? 'bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
    : 'bg-surface border border-border text-text hover:bg-surface-muted active:bg-surface-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  isDisabled.value ? 'opacity-45 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
])

function handleClick(e: MouseEvent) {
  if (isDisabled.value) {
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
    :class="classes"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :tabindex="isDisabled ? -1 : undefined"
    @click="handleClick"
  >
    <Icon v-if="icon && !loading" :name="icon" class="size-4 shrink-0" />
    <span v-if="loading">{{ loadingLabel }}</span>
    <slot v-else />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :class="classes"
    @click="handleClick"
  >
    <Icon v-if="icon && !loading" :name="icon" class="size-4 shrink-0" />
    <span v-if="loading">{{ loadingLabel }}</span>
    <slot v-else />
  </button>
</template>
