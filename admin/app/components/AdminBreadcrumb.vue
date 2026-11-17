<script setup lang="ts">
defineProps<{ items: readonly Crumb[] }>()
</script>

<template>
  <UBreadcrumb :items="[...items]" aria-label="Fil d’Ariane" class="min-w-0" />
</template>
