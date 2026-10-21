<script setup lang="ts">
import type { NuxtError } from '#app'

interface Props {
  error: NuxtError
}

const props = defineProps<Props>()

const is404 = computed(() => props.error.statusCode === 404)
const title = computed(() => (is404.value ? 'Page introuvable' : 'Service indisponible'))
const text = computed(() =>
  is404.value
    ? "La page que vous cherchez n'existe pas ou a été déplacée."
    : 'Une erreur inattendue est survenue lors du chargement des données.',
)

function onReturnHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4 bg-bg text-text">
    <UiStatePanel
      :icon="is404 ? 'lucide:map-pin-off' : 'lucide:cloud-off'"
      :title="title"
      :text="text"
    >
      <template #actions>
        <UiButton variant="primary" icon="lucide:arrow-left" @click="onReturnHome">
          Revenir à l'accueil
        </UiButton>
      </template>
    </UiStatePanel>
  </div>
</template>
