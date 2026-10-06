<script setup lang="ts">
const STEPS = [
  {
    badge: 'Leçon',
    tone: 'bg-lesson-soft text-lesson',
    title: 'Comprendre une notion',
    text: 'Lisez une explication courte, accompagnée d’exemples directement applicables.',
  },
  {
    badge: 'Exercice',
    tone: 'bg-exercise-soft text-exercise',
    title: 'Écrire votre code',
    text: 'Résolvez un exercice ciblé pendant que la notion est encore fraîche.',
  },
  {
    badge: 'Résultat',
    tone: 'bg-success-soft text-success',
    title: 'Vérifier immédiatement',
    text: 'Exécutez réellement le programme et comprenez ce qui fonctionne ou doit changer.',
  },
] as const
</script>

<template>
  <section class="grid gap-8" aria-labelledby="fonctionnement">
    <div class="grid gap-2">
      <p class="eyebrow">Comment ça fonctionne</p>
      <h2 id="fonctionnement" class="text-3xl font-semibold sm:text-4xl">
        De la notion au code, sans rupture
      </h2>
      <p class="text-muted-foreground">
        Chaque chapitre alterne simplement entre une leçon et sa mise en pratique.
      </p>
    </div>
    <ol class="grid gap-4 md:grid-cols-3">
      <li v-for="(step, i) in STEPS" :key="step.title" class="card grid content-start gap-3 p-6">
        <span
          class="grid size-9 place-items-center rounded-full font-semibold"
          :class="step.tone"
          aria-hidden="true"
        >
          {{ i + 1 }}
        </span>
        <span
          class="justify-self-start rounded-full px-2.5 py-0.5 text-xs font-semibold"
          :class="step.tone"
        >
          {{ step.badge }}
        </span>
        <h3 class="text-xl font-semibold">
          <span class="sr-only">Étape {{ i + 1 }} : </span>{{ step.title }}
        </h3>
        <p class="text-muted-foreground text-body-sm">{{ step.text }}</p>
      </li>
    </ol>
  </section>
</template>
