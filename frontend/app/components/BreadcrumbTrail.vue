<script setup lang="ts">
/**
 * Fil d'Ariane commun aux sections Parcours et Connaissance. Le dernier element
 * est la page courante : jamais un lien, et annonce comme tel.
 */
interface Crumb {
  readonly label: string
  readonly to?: string
}

defineProps<{ items: readonly Crumb[] }>()
</script>

<template>
  <nav aria-label="Fil d’Ariane" class="text-body-sm text-muted-foreground">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-2">
        <span v-if="i > 0" aria-hidden="true">/</span>
        <span v-if="i === items.length - 1" aria-current="page" class="text-foreground">
          {{ item.label }}
        </span>
        <NuxtLink v-else-if="item.to" :to="item.to" class="hover:text-foreground underline">
          {{ item.label }}
        </NuxtLink>
        <span v-else>{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
