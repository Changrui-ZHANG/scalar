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
  <div>
    <!-- Desktop inline column (>= xl) if inlineFrom === 'xl' -->
    <div
      v-if="inlineFrom === 'xl'"
      class="hidden xl:block shrink-0 border-r border-border bg-surface"
    >
      <slot />
    </div>

    <!-- Mobile / Tablet Drawer (< xl) -->
    <Teleport to="body">
      <div
        v-if="open"
        :class="['fixed inset-0 z-50 flex', inlineFrom === 'xl' ? 'xl:hidden' : '']"
      >
        <!-- Voile sombre -->
        <div
          class="fixed inset-0 bg-[#0F1115]/50 transition-opacity"
          aria-hidden="true"
          @click="close"
        />

        <!-- Tiroir 320px -->
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="label"
          class="relative flex h-full w-80 max-w-[85vw] flex-col bg-surface shadow-2xl border-r border-border z-10"
        >
          <div class="flex items-center justify-between border-b border-border p-3">
            <span class="text-sm font-semibold text-text truncate">{{ label }}</span>
            <button
              type="button"
              aria-label="Fermer"
              class="inline-flex size-9 items-center justify-center rounded-[10px] text-text-muted hover:bg-surface-muted hover:text-text cursor-pointer"
              @click="close"
            >
              <Icon name="lucide:x" class="size-5" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <slot />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
