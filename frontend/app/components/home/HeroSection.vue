<script setup lang="ts">
const { tracks } = await useTracks()
const firstTrack = computed(() => tracks.value[0] ?? null)
</script>

<template>
  <section class="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center" aria-labelledby="hero">
    <div class="grid justify-items-start gap-6">
      <p class="eyebrow text-brand">Pour reprendre un langage, ou l'apprendre</p>
      <h1 id="hero" class="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
        Une connaissance suffisante. Un rappel <span class="text-brand">suffisant.</span>
      </h1>
      <p class="text-muted-foreground max-w-prose text-lg">
        Scalar relie chaque leçon à un exercice concret. Écrivez votre code, exécutez-le et
        observez immédiatement le résultat.
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          v-if="firstTrack"
          :to="`/parcours/${firstTrack.slug}`"
          class="btn-primary"
        >
          Commencer {{ firstTrack.name }} <span aria-hidden="true">→</span>
        </NuxtLink>
        <NuxtLink v-else to="/parcours" class="btn-primary">
          Découvrir les parcours <span aria-hidden="true">→</span>
        </NuxtLink>
        <NuxtLink to="/parcours" class="btn-secondary">Voir les parcours</NuxtLink>
      </div>
      <p class="text-xs text-muted-foreground">
        Gratuit · sans compte · votre progression reste dans votre navigateur
      </p>
    </div>

    <figure
      aria-hidden="true"
      class="bg-code-surface text-code-foreground w-full max-w-[500px] overflow-hidden rounded-2xl border border-black/20 shadow-xl"
    >
      <figcaption
        class="text-body-sm flex items-center justify-between border-b border-white/10 bg-black/20 px-3 py-2"
      >
        <div class="flex items-center gap-1 text-xs">
          <span class="px-2.5 py-1 text-white/50">Consigne</span>
          <span class="px-2.5 py-1 text-white/50">Leçon</span>
          <span class="rounded bg-white/10 px-2.5 py-1 font-mono font-medium text-white">main.js</span>
        </div>
        <span class="text-xs opacity-60">Démonstration</span>
      </figcaption>
      <pre
        class="overflow-x-auto p-5 font-mono text-sm leading-6"
      ><code><span class="text-indigo-300">function</span> <span class="text-blue-300">isEven</span>(n) {
  <span class="text-orange-300">return</span> n % <span class="text-purple-300">2</span> === <span class="text-purple-300">0</span>
}</code></pre>
      <div class="flex items-center gap-2 border-t border-emerald-500/20 bg-emerald-500/15 px-4 py-3">
        <span class="size-2 rounded-full bg-emerald-400" />
        <p class="font-mono text-xs font-semibold text-emerald-300">3 cas sur 3 réussis</p>
      </div>
    </figure>
  </section>
</template>
