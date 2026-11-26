<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const open = defineModel<boolean>({ default: false })

interface Props {
  label: string
  inlineFrom?: 'xl'
}

withDefaults(defineProps<Props>(), {
  inlineFrom: undefined,
})

function close() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="flex shrink-0">
    <!-- Desktop (≥ 1 280 px) : le plan est une colonne fixe, toute hauteur -->
    <div
      v-if="inlineFrom === 'xl'"
      class="border-border bg-surface hidden h-full border-r xl:block"
    >
      <slot />
    </div>

    <!-- Mobile et tablette : tiroir de 320 px par-dessus la page, avec un voile -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex"
        :class="inlineFrom === 'xl' ? 'xl:hidden' : ''"
      >
        <div class="bg-scrim fixed inset-0" aria-hidden="true" @click="close" />

        <div
          role="dialog"
          aria-modal="true"
          :aria-label="label"
          class="bg-surface relative z-10 h-full w-80 max-w-[85vw] overflow-y-auto"
        >
          <slot />
          <button
            type="button"
            aria-label="Fermer le plan"
            class="rounded-row text-text-muted hover:bg-surface-muted absolute top-3.5 right-3 inline-flex size-11 cursor-pointer items-center justify-center"
            @click="close"
          >
            <Icon name="lucide:x" class="size-5" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
