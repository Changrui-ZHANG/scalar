import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { TrackCard, TrackFilter } from '~/types/episode'
import type { SearchState } from './useSearch'
import { SEARCH_MIN_LENGTH } from '~/utils/search'
import { matchesFilter } from '~/utils/track'

export interface TrackListState {
  readonly filter: Ref<TrackFilter>
  readonly visibleCards: ComputedRef<readonly TrackCard[]>
  readonly showSearch: ComputedRef<boolean>
  readonly emptyReason: ComputedRef<
    { kind: 'filter'; filter: Exclude<TrackFilter, 'all'> } | { kind: 'search'; query: string } | null
  >
}

export function useTrackList(
  cards: ComputedRef<readonly TrackCard[]>,
  search: Pick<SearchState, 'query' | 'results'>,
): TrackListState {
  const filter = ref<TrackFilter>('all')

  const showSearch = computed(() => search.query.value.trim().length >= SEARCH_MIN_LENGTH)

  const visibleCards = computed<readonly TrackCard[]>(() => {
    return cards.value.filter((card) => matchesFilter(card.progress.status, filter.value))
  })

  const emptyReason = computed<
    { kind: 'filter'; filter: Exclude<TrackFilter, 'all'> } | { kind: 'search'; query: string } | null
  >(() => {
    if (showSearch.value) {
      if (search.results.value.length === 0) {
        return { kind: 'search', query: search.query.value.trim() }
      }
      return null
    }

    if (visibleCards.value.length === 0 && filter.value !== 'all') {
      return { kind: 'filter', filter: filter.value }
    }

    return null
  })

  return {
    filter,
    visibleCards,
    showSearch,
    emptyReason,
  }
}
