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
  <div class="px-4 py-8 md:px-6 md:py-11">
    <div class="mx-auto flex max-w-280 flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
      <TrackOverview :card="card" />

      <div class="min-w-0 flex-1">
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
