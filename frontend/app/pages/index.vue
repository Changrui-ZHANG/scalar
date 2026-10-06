<script setup lang="ts">
/** Page publique de presentation : ce qu'est Scalar, pas un tableau de bord. */
useSeoMeta({
  title: 'Scalar — Comprenez le code. Puis faites-le fonctionner.',
  description:
    'Scalar relie chaque leçon à un exercice concret. Écrivez votre code, exécutez-le et observez immédiatement le résultat.',
})

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
  <div class="grid gap-24 py-12 sm:py-20">
    <section class="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center" aria-labelledby="hero">
      <div class="grid justify-items-start gap-6">
        <p class="eyebrow text-brand">Apprendre en faisant</p>
        <h1 id="hero" class="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          Comprenez le code. Puis faites-le <span class="text-brand">fonctionner.</span>
        </h1>
        <p class="text-muted-foreground max-w-prose text-lg">
          Scalar relie chaque leçon à un exercice concret. Écrivez votre code, exécutez-le et
          observez immédiatement le résultat.
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/parcours" class="btn-primary">
            Découvrir les parcours <span aria-hidden="true">→</span>
          </NuxtLink>
          <NuxtLink to="/exercices" class="btn-secondary">Essayer le bac à sable</NuxtLink>
        </div>
      </div>

      <figure
        class="bg-code-surface text-code-foreground overflow-hidden rounded-2xl border border-black/20"
      >
        <figcaption
          class="text-body-sm flex justify-between gap-4 border-b border-white/10 px-4 py-3"
        >
          <span class="font-mono font-semibold">conditions.js</span>
          <span class="opacity-60">Démonstration</span>
        </figcaption>
        <pre
          class="overflow-x-auto p-5 font-mono text-sm leading-7"
        ><span class="text-indigo-300">const</span> age = 20

<span class="text-orange-300">if</span> (age &gt;= 18) {
  console.log(<span class="text-emerald-300">"majeur"</span>)
}</pre>
        <div class="bg-emerald-500/15 px-4 py-3">
          <p class="text-body-sm font-semibold text-emerald-300">Exécution réussie</p>
          <pre class="font-mono text-sm">majeur</pre>
        </div>
      </figure>
    </section>

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

    <section
      class="bg-foreground text-background grid gap-6 rounded-2xl p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10"
      aria-labelledby="pourquoi"
    >
      <div class="grid gap-3">
        <p class="text-xs font-semibold tracking-[0.12em] uppercase opacity-75">Pourquoi Scalar</p>
        <h2 id="pourquoi" class="text-3xl font-semibold sm:text-4xl">
          Lire ne suffit pas pour apprendre à programmer.
        </h2>
        <p class="max-w-prose opacity-80">
          Scalar réduit la distance entre ce que vous venez de comprendre et ce que vous êtes
          capable de construire.
        </p>
      </div>
      <NuxtLink
        to="/parcours"
        class="btn bg-background text-foreground justify-self-start border-transparent"
      >
        Choisir un parcours <span aria-hidden="true">→</span>
      </NuxtLink>
    </section>
  </div>
</template>
