<script setup lang="ts">
// Titre et texte de /parcours (specs-site.md § 5.1).
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <h1 class="font-display text-text md:text-h1 text-3xl font-semibold tracking-tight">
      Parcours
    </h1>
    <p class="text-text-muted md:text-body text-base">
      Chaque parcours suit un ordre : leçons, puis exercices corrigés automatiquement.
    </p>
    <p class="text-ui text-text-muted">
      Pas sûr de votre niveau ?
      <NuxtLink to="/positionnement" class="text-primary font-semibold hover:underline">
        Faites le test de positionnement
      </NuxtLink>
    </p>
  </div>
</template>
