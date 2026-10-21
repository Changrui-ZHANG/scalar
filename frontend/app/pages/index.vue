<script setup lang="ts">
/** Page publique de presentation : ce qu'est Scalar, pas un tableau de bord. */
useSeoMeta({
  title: 'Scalar — Une connaissance suffisante. Un rappel suffisant.',
  description:
    'Pour reprendre un langage, ou l’apprendre. Des leçons concises et des exercices interactifs pour aller droit au but, directement dans votre navigateur.',
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
