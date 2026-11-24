<script setup lang="ts">
// Panneau d'état centré (specs-site.md § 11) : icône, titre, texte, boutons (slot actions).
interface Props {
  icon: string
  title: string
  text: string
}

const { icon, title, text } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col items-center gap-4.5 text-center">
    <div class="rounded-state bg-surface-muted flex size-16 items-center justify-center">
      <Icon :name="icon" class="text-text-muted size-7" />
    </div>
    <h1 class="font-display text-text text-3xl font-semibold tracking-tight md:text-4xl">
      {{ title }}
    </h1>
    <p class="text-body text-text-muted max-w-130 leading-snug">{{ text }}</p>
    <div v-if="$slots.actions" class="flex flex-wrap justify-center gap-3 pt-2">
      <slot name="actions" />
    </div>
  </div>
</template>
