<script setup lang="ts">
interface Props {
  start: { trackName: string; path: string } | null
}

defineProps<Props>()
</script>

<template>
  <section class="mx-auto flex w-full max-w-280 flex-col items-center gap-12 py-12 md:py-16 xl:flex-row xl:items-center xl:justify-between">
    <!-- Colonne gauche texte & actions -->
    <div class="flex max-w-xl flex-col items-start gap-6">
      <div class="flex items-center gap-2">
        <span class="font-display font-semibold text-primary text-base">Scalar</span>
        <span class="text-text-muted" aria-hidden="true">·</span>
        <span class="text-sm md:text-[15px] font-semibold text-primary">
          Pour reprendre un langage, ou l'apprendre
        </span>
      </div>

      <h1 class="font-display text-4xl md:text-5xl xl:text-hero font-semibold leading-[1.05] tracking-tight text-text">
        Une connaissance suffisante. Un rappel suffisant.
      </h1>

      <p class="text-base md:text-lede text-text-muted leading-relaxed">
        Des leçons concises et des exercices corrigés automatiquement pour aller droit à l’essentiel, sans détour.
      </p>

      <div class="flex flex-wrap items-center gap-4">
        <UiButton
          v-if="start"
          :to="start.path"
          variant="primary"
          icon="lucide:play"
        >
          Commencer {{ start.trackName }}
        </UiButton>

        <UiButton
          to="/parcours"
          variant="secondary"
        >
          Voir les parcours
        </UiButton>
      </div>

      <span class="text-xs text-text-muted">
        Gratuit · sans compte · votre progression reste dans votre navigateur
      </span>
    </div>

    <!-- Colonne droite : carte statique -->
    <div class="w-full xl:w-auto flex justify-center">
      <HomeDemoCard />
    </div>
  </section>
</template>
