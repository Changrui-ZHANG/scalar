<template>
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
</template>
