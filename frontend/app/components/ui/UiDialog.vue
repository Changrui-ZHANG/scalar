<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { required: true })

withDefaults(
  defineProps<{
    title: string
    fullscreenOnMobile?: boolean
  }>(),
  {
    fullscreenOnMobile: false,
  }
)

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
    aria-labelledby="dialog-title"
    class="backdrop:bg-black/60 fixed z-50 bg-transparent p-0 text-inherit shadow-2xl backdrop:backdrop-blur-xs"
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
      <h2 id="dialog-title" class="sr-only">
        {{ title }}
      </h2>
      <slot />
      <slot name="actions" />
    </div>
  </dialog>
</template>
