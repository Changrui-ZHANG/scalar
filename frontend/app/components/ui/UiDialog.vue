<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { required: true })

// Dialogue natif <dialog> ouvert par showModal() (specs-site.md § 12) : focus piégé,
// Échap et voile viennent du navigateur.
// - par défaut : titre visible, contenu et boutons (slot actions) avec des marges ;
// - hideTitle : titre lu seulement par les lecteurs d'écran, contenu libre (recherche rapide).
const {
  title,
  fullscreenOnMobile = false,
  hideTitle = false,
} = defineProps<{
  title: string
  fullscreenOnMobile?: boolean
  hideTitle?: boolean
}>()

// Identifiant unique du titre, pour aria-labelledby.
const titleId = useId()

const dialogRef = ref<HTMLDialogElement | null>(null)
let previousActiveElement: HTMLElement | null = null

function syncModal(isOpen: boolean) {
  if (!import.meta.client || !dialogRef.value) return

  if (isOpen) {
    if (!dialogRef.value.open) {
      previousActiveElement = document.activeElement as HTMLElement | null
      try {
        dialogRef.value.showModal()
      } catch {
        // Fallback si showModal n'est pas supporté (ex: tests légers)
        dialogRef.value.setAttribute('open', '')
      }
    }
  } else {
    if (dialogRef.value.open) {
      dialogRef.value.close()
    }
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus()
    }
  }
}

watch(open, (isOpen) => {
  nextTick(() => syncModal(isOpen))
})

onMounted(() => {
  if (open.value) {
    nextTick(() => syncModal(true))
  }
})

onUnmounted(() => {
  if (dialogRef.value?.open) {
    dialogRef.value.close()
  }
})

function onCancel(e: Event) {
  e.preventDefault()
  open.value = false
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === dialogRef.value) {
    open.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    :aria-labelledby="titleId"
    class="fixed z-50 bg-transparent p-0 text-inherit shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs"
    :class="[
      fullscreenOnMobile
        ? 'inset-0 m-0 h-full max-h-none w-full max-w-none rounded-none sm:inset-auto sm:top-16 sm:mx-auto sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-xl'
        : 'top-20 mx-auto max-h-[85vh] max-w-lg rounded-xl',
    ]"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <div
      class="bg-surface border-border flex h-full w-full flex-col overflow-hidden border"
      :class="[fullscreenOnMobile ? 'rounded-none sm:rounded-xl' : 'rounded-xl']"
    >
      <template v-if="hideTitle">
        <h2 :id="titleId" class="sr-only">{{ title }}</h2>
        <slot />
        <slot name="actions" />
      </template>
      <div v-else class="flex flex-col gap-3 p-6">
        <h2 :id="titleId" class="font-display text-text text-xl font-semibold">{{ title }}</h2>
        <slot />
        <div class="flex justify-end gap-3 pt-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </dialog>
</template>
