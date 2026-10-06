<script setup lang="ts">
/** Page publique de presentation : ce qu'est Scalar, pas un tableau de bord. */
useSeoMeta({
  title: 'Scalar — Comprenez le code. Puis faites-le fonctionner.',
  description:
    'Scalar relie chaque leçon à un exercice concret. Écrivez votre code, exécutez-le et observez immédiatement le résultat.',
})
</script>

<template>
  <div class="grid gap-24 py-12 sm:py-20">
    <HomeHeroSection />
    <HomeHowItWorksSection />
    <HomeFeaturesSection />
    <HomeWhySection />
  </div>
</template>
