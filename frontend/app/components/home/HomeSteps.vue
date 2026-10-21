<script setup lang="ts">
/** Trois cartes explicatives « 1. Lire », « 2. Coder », « 3. Vérifier » (§ 4.1) */
const STEPS = [
  {
    num: '1',
    title: 'Lire',
    icon: 'lucide:book-open',
    text: 'Une notion, ses pièges, des exemples ciblés sans bavardage.',
  },
  {
    num: '2',
    title: 'Coder',
    icon: 'lucide:code-xml',
    text: 'Un éditeur réactif avec autocomplétion pour appliquer immédiatement.',
  },
  {
    num: '3',
    title: 'Vérifier',
    icon: 'lucide:check-check',
    text: 'Des tests exécutés instantanément dans un bac à sable sécurisé.',
  },
] as const
</script>

<template>
  <section class="mx-auto w-full max-w-280 py-8 border-t border-border">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="step in STEPS"
        :key="step.num"
        class="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-6"
      >
        <div class="flex items-center gap-3">
          <span class="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold text-sm">
            {{ step.num }}
          </span>
          <Icon :name="step.icon" class="size-5 text-primary" />
          <h2 class="font-display text-lg font-semibold text-text">
            {{ step.title }}
          </h2>
        </div>
        <p class="text-sm text-text-muted leading-relaxed">
          {{ step.text }}
        </p>
      </div>
    </div>
  </section>
</template>
