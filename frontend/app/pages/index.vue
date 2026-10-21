<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTracks } from '~/composables/useTracks'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: [],
  description: 'Pour reprendre un langage, ou l’apprendre. Des leçons concises et des exercices corrigés automatiquement, sans compte ni détour.',
  type: 'website',
})

const { start, resume, cards } = await useTracks()

const isClientMounted = ref(false)

onMounted(() => {
  isClientMounted.value = true
})
</script>

<template>
  <div class="px-4 md:px-6 py-8 md:py-12">
    <!-- Mode Habitué (si progression locale au montage) avec fondu 150ms -->
    <div
      v-if="isClientMounted && resume !== null"
      class="mx-auto max-w-280 transition-opacity duration-150 ease-out"
    >
      <HomeWelcome />
      <HomeResumeCard :target="resume" />
      <HomeTrackGrid :cards="cards" />
      <HomeSandboxPromo />
    </div>

    <!-- Mode Visiteur (SSR et nouvel arrivant) -->
    <div v-else class="mx-auto max-w-280 flex flex-col gap-12">
      <HomeHero :start="start" />
      <HomeSteps />
    </div>
  </div>
</template>
