<script setup lang="ts">
/** Texte en ligne de `RichText` : alterne texte brut et `code`. */
defineProps<{ parts: readonly { readonly code: boolean; readonly text: string }[] }>()
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <code v-if="part.code" class="bg-foreground/5 rounded px-1 font-mono text-[0.9em]">{{
      part.text
    }}</code>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
