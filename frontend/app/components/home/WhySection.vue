<template>
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
</template>
