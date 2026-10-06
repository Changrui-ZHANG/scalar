<script setup lang="ts">
const FEATURES = [
  {
    eyebrow: 'Parcours guidés',
    tone: 'text-lesson',
    title: 'Avancer chapitre par chapitre',
    text: 'Un ordre clair de leçons et d’exercices pour ne jamais se demander quoi faire ensuite.',
  },
  {
    eyebrow: 'Exécution réelle',
    tone: 'text-exercise',
    title: 'Voir ce que produit le code',
    text: 'Le programme est exécuté : vous consultez sa sortie et corrigez votre solution.',
  },
  {
    eyebrow: 'Plusieurs langages',
    tone: 'text-example',
    title: 'Suivre plusieurs parcours',
    text: 'Commencez un nouveau langage sans perdre la progression des parcours déjà suivis.',
  },
  {
    eyebrow: 'Bac à sable',
    tone: 'text-success',
    title: 'Tester sans consigne',
    text: 'Collez ou écrivez un script pour expérimenter en dehors des parcours.',
  },
] as const
</script>

<template>
  <section class="grid gap-8" aria-labelledby="possibilites">
    <div class="grid gap-2">
      <p class="eyebrow">Ce que vous pouvez faire</p>
      <h2 id="possibilites" class="text-3xl font-semibold sm:text-4xl">
        Un espace pour apprendre et expérimenter
      </h2>
      <p class="text-muted-foreground max-w-prose">
        Suivez un chemin guidé ou testez librement une idée. Scalar garde la théorie et la
        pratique au même endroit.
      </p>
    </div>
    <ul class="card grid overflow-hidden sm:grid-cols-2">
      <li
        v-for="feature in FEATURES"
        :key="feature.title"
        class="grid content-start gap-2 border-b p-6 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
      >
        <p class="text-body-sm font-semibold" :class="feature.tone">{{ feature.eyebrow }}</p>
        <h3 class="text-xl font-semibold">{{ feature.title }}</h3>
        <p class="text-muted-foreground text-body-sm">{{ feature.text }}</p>
      </li>
    </ul>
  </section>
</template>
