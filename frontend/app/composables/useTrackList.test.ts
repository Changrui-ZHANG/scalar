import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { TrackCard } from '~/types/episode'
import type { SearchResult } from '~/types/search'
import { useTrackList } from './useTrackList'

describe('composables/useTrackList', () => {
  const sampleCard = (status: 'not_started' | 'in_progress' | 'completed'): TrackCard => ({
    view: {
      track: { slug: status, name: status, summary: '', programmingLanguage: 'javascript', prerequisite: null },
      chapters: [],
    },
    progress: { done: 0, total: 10, percent: 0, status, current: null },
    prerequisite: null,
  })

  it('filtre les cartes selon le filtre actif', () => {
    const cards = computed(() => [
      sampleCard('not_started'),
      sampleCard('in_progress'),
      sampleCard('completed'),
    ])
    const query = ref('')
    const results = computed<readonly SearchResult[]>(() => [])

    const listState = useTrackList(cards, { query, results })

    expect(listState.visibleCards.value).toHaveLength(3)
    expect(listState.showSearch.value).toBe(false)
    expect(listState.emptyReason.value).toBeNull()

    listState.filter.value = 'in_progress'
    expect(listState.visibleCards.value).toHaveLength(1)
    expect(listState.visibleCards.value[0]?.progress.status).toBe('in_progress')
  })

  it('bascule en mode recherche si la requête >= 2 caractères', () => {
    const cards = computed(() => [sampleCard('not_started')])
    const query = ref('ja')
    const results = computed<readonly SearchResult[]>(() => [])

    const listState = useTrackList(cards, { query, results })
    expect(listState.showSearch.value).toBe(true)
    expect(listState.emptyReason.value).toEqual({ kind: 'search', query: 'ja' })
  })
})
