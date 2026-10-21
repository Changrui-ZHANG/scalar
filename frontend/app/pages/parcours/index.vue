<script setup lang="ts">
import { useTracks } from '~/composables/useTracks'
import { useSearch } from '~/composables/useSearch'
import { useTrackList } from '~/composables/useTrackList'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Parcours'],
  description: 'Chaque parcours suit un ordre : leçons, puis exercices corrigés automatiquement.',
  type: 'website',
})

const { views, cards } = await useTracks()
const search = useSearch(views)
const { filter, visibleCards, showSearch, emptyReason } = useTrackList(cards, search)
</script>

<template>
  <div class="mx-auto max-w-280 px-4 md:px-6 py-8 md:py-12">
    <TrackListHeader />

    <TrackListToolbar
      v-model:query="search.query.value"
      v-model:filter="filter"
    />

    <TrackListEmpty
      v-if="emptyReason"
      :reason="emptyReason"
    />

    <TrackListSearchResults
      v-else-if="showSearch"
      :results="search.results.value"
    />

    <TrackListGrid
      v-else
      :cards="visibleCards"
    />
  </div>
</template>
