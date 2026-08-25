<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const titre = computed(() =>
  props.error.statusCode === 404 ? 'Page introuvable' : 'Une erreur est survenue',
)

function retourAccueil() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="grid min-h-screen place-items-center p-4">
    <section class="grid gap-4 text-center">
      <p class="text-sm">{{ error.statusCode }}</p>
      <h1 class="text-3xl font-semibold">{{ titre }}</h1>
      <button type="button" class="underline" @click="retourAccueil">Revenir a l'accueil</button>
    </section>
  </div>
</template>
