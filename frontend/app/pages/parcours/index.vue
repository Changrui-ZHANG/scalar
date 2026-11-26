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
  <div class="px-4 py-8 md:px-6 md:py-11">
    <div class="mx-auto flex max-w-280 flex-col gap-6.5">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <TrackListHeader />
        <TrackListSearch v-model="search.query.value" />
      </div>

      <TrackListFilters v-model="filter" />

      <TrackListEmpty v-if="emptyReason" :reason="emptyReason" />
      <TrackListSearchResults v-else-if="showSearch" :results="search.results.value" />
      <TrackListGrid v-else :cards="visibleCards" />
    </div>
  </div>
</template>
