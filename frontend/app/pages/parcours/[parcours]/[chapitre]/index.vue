<script setup lang="ts">
/**
 * Ancienne page de chapitre : un chapitre n'est plus qu'une section du fil.
 * Les liens deja partages menent a cette section plutot qu'a un 404.
 */
const route = useRoute()
await navigateTo(
  `/parcours/${seg(String(route.params.parcours))}#${seg(String(route.params.chapitre))}`,
  { redirectCode: 301, replace: true },
)
</script>

<template>
  <p class="py-10">Redirection vers le parcours…</p>
</template>
