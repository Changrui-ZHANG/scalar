<script setup lang="ts">
import { computed } from 'vue'
import { useTrack } from '~/composables/useTrack'
import { useEpisodes } from '~/composables/useEpisodes'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { track, card } = await useTrack()
const { episodes, progress, completed } = useEpisodes(track)

const anchor = computed(() => {
  const hash = route.hash.replace(/^#/, '')
  return hash || null
})

usePageSeo({
  title: [card.value.view.track.name],
  description: card.value.view.track.summary,
  type: 'website',
})
</script>

<template>
  <div class="mx-auto max-w-280 px-4 md:px-6 py-8 md:py-12">
    <div class="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-12 items-start">
      <!-- Colonne présentation latérale collante -->
      <TrackOverview :card="card" />

      <!-- Colonne des niveaux et chapitres -->
      <div class="flex flex-col gap-6">
        <TrackLevelList
          :track="track"
          :episodes="episodes"
          :progress="progress"
          :completed="completed"
          :anchor="anchor"
        />
      </div>
    </div>
  </div>
</template>
