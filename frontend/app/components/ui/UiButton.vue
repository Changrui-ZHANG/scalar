<script setup lang="ts">
// Bouton du site (specs-site.md § 3.3) : principal (plein) ou secondaire (contour).
// Rendu en lien quand `to` est donné.
interface Props {
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  to?: string
  icon?: string // icône à gauche du libellé
  iconRight?: string // icône à droite du libellé (flèche « → » de la maquette)
  dense?: boolean // petit bouton des barres (rayon 10)
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}

const {
  variant = 'primary',
  type = 'button',
  to = undefined,
  icon = undefined,
  iconRight = undefined,
  dense = false,
  loading = false,
  loadingLabel = 'Chargement…',
  disabled = false,
} = defineProps<Props>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isDisabled = computed(() => disabled || loading)

// Classes communes, puis taille, puis couleurs.
const classes = computed(() => {
  const list = [
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  ]

  if (dense) {
    list.push('h-10 px-4 text-sm rounded-row')
  } else {
    list.push('h-12 px-5.5 text-base rounded-control')
  }

  if (variant === 'primary') {
    list.push('bg-primary text-on-primary hover:bg-primary/90')
  } else {
    list.push('border border-border bg-surface text-text hover:bg-surface-muted')
  }

  if (isDisabled.value) {
    list.push('cursor-not-allowed opacity-45')
  } else {
    list.push('cursor-pointer')
  }

  return list
})

function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
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
    <Icon v-if="iconRight && !loading" :name="iconRight" class="size-4 shrink-0" />
  </NuxtLink>
  <button v-else :type="type" :disabled="isDisabled" :class="classes" @click="handleClick">
    <Icon v-if="icon && !loading" :name="icon" class="size-4 shrink-0" />
    <span v-if="loading">{{ loadingLabel }}</span>
    <slot v-else />
    <Icon v-if="iconRight && !loading" :name="iconRight" class="size-4 shrink-0" />
  </button>
</template>
