<script setup lang="ts">
useSeoMeta({
  title: 'Scalar',
  description: "Apprendre le developpement web, valide par l'execution reelle du code.",
})
</script>

<template>
  <section class="grid gap-4 py-12">
    <h1 class="text-3xl font-semibold md:text-5xl">Scalar</h1>
    <p class="max-w-prose">
      Apprendre le developpement web, valide par l'execution reelle du code.
    </p>
    <NuxtLink
      to="/parcours"
      class="bg-foreground text-background justify-self-start rounded-md px-4 py-2 font-semibold"
    >
      Choisir un parcours
    </NuxtLink>
  </section>
</template>
