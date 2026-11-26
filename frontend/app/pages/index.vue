<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTracks } from '~/composables/useTracks'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: [],
  description:
    'Pour reprendre un langage, ou l’apprendre. Des leçons concises et des exercices corrigés automatiquement, sans compte ni détour.',
  type: 'website',
})

const { start, resume, cards } = await useTracks()

// Deux accueils (specs-site.md § 4) : « nouveau visiteur » au rendu serveur et au premier
// passage ; « habitué » le remplace au montage s'il y a une progression locale.
const isClientMounted = ref(false)

onMounted(() => {
  isClientMounted.value = true
})
</script>

<template>
  <div v-if="isClientMounted && resume !== null" class="px-4 py-12 md:px-6">
    <div class="mx-auto flex max-w-280 flex-col gap-9">
      <HomeWelcome />
      <HomeResumeCard :target="resume" />
      <HomeTrackGrid :cards="cards" />
      <HomeSandboxPromo />
    </div>
  </div>

  <div v-else class="px-4 pt-10 pb-10 md:px-6 xl:pt-16">
    <div class="mx-auto flex max-w-280 flex-col gap-14">
      <HomeHero :start="start" />
      <HomeSteps />
    </div>
  </div>
</template>
