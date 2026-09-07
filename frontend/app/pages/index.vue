<script setup lang="ts">
import { cn } from '~/lib/utils'
import { buttonVariants } from '~/components/ui/button'

useSeoMeta({
  title: 'Scalar',
  description: "Apprendre le developpement web, valide par l'execution reelle du code.",
})

// Slug fixe, en dur : aucun catalogue ni aucune liste d'exercices n'existe
// encore (epic 3, backlog), et il n'y a pas de commande de seed. Cet
// exercice doit exister en base pour que le lien reponde ; a remplacer par
// un vrai catalogue le jour ou il existe.
const SLUG_EXERCICE_DEMO = 'addition-de-deux-nombres'
</script>

<template>
  <section class="grid gap-4 py-12">
    <h1 class="text-3xl font-semibold md:text-5xl">Scalar</h1>
    <p class="max-w-prose">
      Apprendre le developpement web, valide par l'execution reelle du code.
    </p>
    <NuxtLink
      :to="`/exercices/${SLUG_EXERCICE_DEMO}`"
      :class="cn(buttonVariants({ size: 'lg' }), 'w-fit')"
    >
      Essayer un exercice
    </NuxtLink>
  </section>
</template>
