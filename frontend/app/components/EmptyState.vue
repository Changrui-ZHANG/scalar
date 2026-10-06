<script setup lang="ts">
/** Etat vide : aucun resultat, aucun contenu publie. Les actions passent par le slot. */
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="card grid justify-items-center gap-3 p-8 text-center">
    <p class="font-display text-xl font-semibold">{{ title }}</p>
    <p v-if="description" class="text-muted-foreground max-w-prose">{{ description }}</p>
    <slot />
  </div>
</template>
