<script setup lang="ts">
defineProps<{
  resume: { readonly track: TrackSummary; readonly episode: TrackEpisode } | null
  loadError: unknown
}>()
</script>

<template>
  <header class="grid gap-3">
    <p class="eyebrow">Apprendre</p>
    <h1 class="text-4xl font-semibold sm:text-5xl">Vos parcours</h1>
    <p class="text-muted-foreground max-w-2xl text-lg">
      Chaque parcours est un fil continu de leçons et d’exercices. Avancez dans l’ordre ou reprenez
      librement un épisode.
    </p>
  </header>

  <NextEpisodeCard
    v-if="resume"
    :eyebrow="`Continuer ${resume.track.name}`"
    :episode="resume.episode"
    action-label="Reprendre"
  />

  <p v-if="loadError" role="alert" class="alert-error">
    {{ apiErrorMessage(loadError, 'Les parcours sont injoignables pour l’instant.') }}
  </p>
</template>
