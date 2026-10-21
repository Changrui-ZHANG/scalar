<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

function close() {
  open.value = false
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex md:hidden">
    <!-- Voile -->
    <div
      class="fixed inset-0 bg-[#0F1115]/50 transition-opacity"
      aria-hidden="true"
      @click="close"
    />

    <!-- Feuille de menu -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
      class="relative ml-auto flex h-full w-72 flex-col bg-surface p-6 shadow-2xl border-l border-border"
    >
      <div class="flex items-center justify-between pb-6 border-b border-border">
        <span class="font-display font-bold text-lg text-text">Menu</span>
        <button
          type="button"
          aria-label="Fermer le menu"
          class="inline-flex size-9 items-center justify-center rounded-[10px] hover:bg-surface-muted text-text-muted hover:text-text cursor-pointer"
          @click="close"
        >
          <Icon name="lucide:x" class="size-5" />
        </button>
      </div>

      <nav class="flex flex-col gap-2 pt-6">
        <NuxtLink
          to="/parcours"
          class="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-text hover:bg-surface-muted"
          @click="close"
        >
          <Icon name="lucide:layers" class="size-5 text-primary" />
          <span>Parcours</span>
        </NuxtLink>
        <NuxtLink
          to="/exercices"
          class="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-text hover:bg-surface-muted"
          @click="close"
        >
          <Icon name="lucide:code-xml" class="size-5 text-exercise" />
          <span>Bac à sable</span>
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
