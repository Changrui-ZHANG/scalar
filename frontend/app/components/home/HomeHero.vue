<script setup lang="ts">
// Héros de l'accueil « nouveau visiteur » (specs-site.md § 4.1).
// À gauche le texte et les boutons, à droite la carte de démonstration.
interface Props {
  // « Commencer <parcours> » : premier épisode du premier parcours ; null si aucun parcours
  start: { trackName: string; path: string } | null
}

const { start } = defineProps<Props>()
</script>

<template>
  <section class="flex w-full flex-col gap-10 xl:flex-row xl:items-center xl:gap-14">
    <div class="flex flex-1 flex-col gap-5">
      <p class="text-label text-primary font-semibold">Pour reprendre un langage, ou l’apprendre</p>

      <h1
        class="font-display leading-hero text-text xl:text-hero text-4xl font-semibold tracking-tight"
      >
        Une connaissance suffisante. Un rappel suffisant.
      </h1>

      <p class="text-text-muted xl:text-lede text-lg leading-relaxed">
        Des leçons courtes, des exercices corrigés par de vrais tests, et le cours toujours à côté
        de votre code.
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <UiButton v-if="start" :to="start.path" icon-right="lucide:arrow-right">
          Commencer {{ start.trackName }}
        </UiButton>
        <UiButton to="/parcours" variant="secondary">Voir les parcours</UiButton>
      </div>

      <p class="text-small text-text-muted">
        Premiers chapitres gratuits · sans compte · progression gardée dans votre navigateur
      </p>
    </div>

    <HomeDemoCard />
  </section>
</template>
