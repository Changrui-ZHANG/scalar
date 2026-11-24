<script setup lang="ts">
// Champ de recherche de /parcours (specs-site.md § 5.1), à droite du titre.
const query = defineModel<string>({ required: true })
</script>

<template>
  <label
    class="rounded-control border-border bg-surface focus-within:border-primary flex h-11 w-full items-center gap-2.5 border px-3.5 md:w-85"
  >
    <Icon name="lucide:search" class="text-text-muted size-4 shrink-0" />
    <span class="sr-only">Rechercher une notion, un exercice</span>
    <input
      v-model="query"
      type="search"
      placeholder="Rechercher une notion, un exercice…"
      class="text-label text-text placeholder:text-text-muted w-full bg-transparent outline-none"
    >
  </label>
</template>
