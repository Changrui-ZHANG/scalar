<script setup lang="ts">
// Encart « Bac à sable » de l'accueil habitué (specs-site.md § 4.2).
</script>

<template>
  <div
    class="rounded-tile border-border flex flex-col gap-4 border px-5.5 py-4.5 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-3.5">
      <Icon name="lucide:square-terminal" class="text-text-muted size-5.5 shrink-0" />
      <div class="flex flex-col gap-0.5">
        <h2 class="text-text font-sans text-base font-bold">Bac à sable</h2>
        <p class="text-text-muted text-sm">
          Tester une idée en JavaScript ou TypeScript, hors des parcours.
        </p>
      </div>
    </div>

    <NuxtLink
      to="/exercices"
      class="rounded-row border-border bg-surface text-ui text-text hover:bg-surface-muted flex items-center gap-1.5 self-start border px-3.5 py-2.25 font-semibold sm:self-auto"
    >
      Ouvrir
      <Icon name="lucide:arrow-up-right" class="size-4" />
    </NuxtLink>
  </div>
</template>
