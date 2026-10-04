<script setup lang="ts">
useSeoMeta({
  title: 'Parcours — Scalar',
  description: 'Choisir un langage et apprendre chapitre par chapitre, en écrivant du vrai code.',
})

const { languages } = await useLanguages()
</script>

<template>
  <section class="grid gap-8 py-8">
    <BreadcrumbTrail :items="[{ label: 'Parcours' }]" />

    <header class="grid gap-2">
      <h1 class="font-display text-3xl md:text-4xl">Parcours</h1>
      <p class="max-w-prose">
        Choisissez un langage. Chaque parcours se suit dans l’ordre, chapitre par chapitre.
      </p>
    </header>

    <ol class="grid gap-3 md:grid-cols-2">
      <li v-for="(item, i) in languages" :key="item.slug">
        <NuxtLink
          :to="`/parcours/${item.slug}`"
          class="hover:bg-foreground/5 grid h-full gap-1 rounded-md border p-4"
        >
          <span class="text-title">{{ i + 1 }}. {{ item.label }}</span>
          <span class="text-body-sm text-muted-foreground">{{ item.summary }}</span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>
