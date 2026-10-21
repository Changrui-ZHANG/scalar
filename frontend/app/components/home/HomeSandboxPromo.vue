<script setup lang="ts">
/** Encart Bac à sable de l'accueil habitué (§ 4.2) */
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-border bg-surface p-6">
    <div class="flex items-center gap-4">
      <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-exercise">
        <Icon name="lucide:code-xml" class="size-6" />
      </div>
      <div class="flex flex-col">
        <h3 class="font-display text-lg font-bold text-text">
          Bac à sable
        </h3>
        <p class="text-sm text-text-muted">
          Testez du code JavaScript ou TypeScript librement, sans contrainte de parcours.
        </p>
      </div>
    </div>

    <UiButton
      to="/exercices"
      variant="secondary"
      icon="lucide:arrow-right"
    >
      Ouvrir
    </UiButton>
  </div>
</template>
