<script setup lang="ts">
// Trois cartes « 1. Lire », « 2. Coder », « 3. Vérifier » de l'accueil (specs-site.md § 4.1).
// Textes et icônes de la maquette.
const steps = [
  {
    title: '1. Lire',
    text: 'Une leçon courte, avec du code commenté.',
    icon: 'lucide:book-open',
    iconColor: 'text-primary',
  },
  {
    title: '2. Coder',
    text: 'L’exercice s’ouvre à côté de la leçon : plus d’allers-retours.',
    icon: 'lucide:code-xml',
    iconColor: 'text-exercise',
  },
  {
    title: '3. Vérifier',
    text: 'De vrais tests, dont certains cachés, jugent votre solution.',
    icon: 'lucide:circle-check',
    iconColor: 'text-success',
  },
]
</script>

<template>
  <section class="grid w-full grid-cols-1 gap-4.5 md:grid-cols-3">
    <div
      v-for="step in steps"
      :key="step.title"
      class="rounded-tile border-border bg-surface flex gap-3.5 border p-5"
    >
      <div
        class="rounded-control bg-surface-muted flex size-10 shrink-0 items-center justify-center"
      >
        <Icon :name="step.icon" class="size-5" :class="step.iconColor" />
      </div>
      <div class="flex flex-col gap-1">
        <h2 class="font-display text-lede text-text font-semibold">{{ step.title }}</h2>
        <p class="text-ui text-text-muted leading-snug">{{ step.text }}</p>
      </div>
    </div>
  </section>
</template>
