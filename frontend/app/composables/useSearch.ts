import { computed, getCurrentInstance, onMounted, onUnmounted, ref, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type { TrackView } from '@scalar/shared/api'
import type { SearchGroup, SearchResult } from '~/types/search'
import {
  buildSearchIndex,
  groupByTrack,
  SEARCH_DEBOUNCE_MS,
  SEARCH_GROUP_LIMIT,
  searchEntries,
} from '~/utils/search'
import { fetchAllTrackViews } from '~/services/tracks'

export interface SearchState {
  readonly query: Ref<string>
  readonly results: ComputedRef<readonly SearchResult[]>
  readonly groups: ComputedRef<readonly SearchGroup[]>
  readonly status: Ref<'idle' | 'loading' | 'ready' | 'error'>
  readonly open: Ref<boolean>
  readonly shortcutLabel: ComputedRef<string>
  load(): Promise<void>
}

export function useSearch(views?: MaybeRefOrGetter<readonly TrackView[] | null>): SearchState {
  const isGlobalModal = views === undefined

  // En mode global (LayoutSearchDialog / Header), l'état est partagé dans l'application
  const query = isGlobalModal
    ? useState<string>('search-query', () => '')
    : ref('')

  const debouncedQuery = ref(query.value)
  const open = useState<boolean>('search-open', () => false)
  const cachedViews = useState<readonly TrackView[] | null>('search-cached-views', () => null)
  const status = isGlobalModal
    ? useState<'idle' | 'loading' | 'ready' | 'error'>('search-status', () => 'idle')
    : ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  watch(query, (val) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    if (val.trim().length === 0) {
      debouncedQuery.value = ''
    } else {
      debounceTimer = setTimeout(() => {
        debouncedQuery.value = val
      }, SEARCH_DEBOUNCE_MS)
    }
  })

  const effectiveViews = computed<readonly TrackView[] | null>(() => {
    if (views !== undefined) {
      return toValue(views)
    }
    return cachedViews.value
  })

  // Met à jour le statut ready si les vues sont déjà disponibles et qu'on n'est pas en loading/error
  if (effectiveViews.value && effectiveViews.value.length > 0 && status.value === 'idle') {
    status.value = 'ready'
  }

  const index = computed(() => {
    const list = effectiveViews.value
    return list && list.length > 0 ? buildSearchIndex(list) : []
  })

  const results = computed(() => searchEntries(index.value, debouncedQuery.value))
  const groups = computed(() => groupByTrack(results.value, SEARCH_GROUP_LIMIT))

  const shortcutLabel = computed(() => {
    if (import.meta.client && typeof navigator !== 'undefined') {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform || '')
      return isMac ? '⌘ K' : 'Ctrl K'
    }
    return 'Ctrl K'
  })

  async function load(): Promise<void> {
    if (views !== undefined) {
      status.value = 'ready'
      return
    }

    if (cachedViews.value && cachedViews.value.length > 0) {
      status.value = 'ready'
      return
    }

    status.value = 'loading'
    try {
      const list = await fetchAllTrackViews()
      cachedViews.value = list
      status.value = 'ready'
    } catch {
      status.value = 'error'
    }
  }

  // Écoute globale Ctrl/Cmd + K sans views (contexte de LayoutSearchDialog)
  if (import.meta.client && isGlobalModal && getCurrentInstance()) {
    onMounted(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault()
          open.value = !open.value
        }
      }
      window.addEventListener('keydown', onKeyDown, { capture: true })
      onUnmounted(() => {
        window.removeEventListener('keydown', onKeyDown, { capture: true })
      })
    })
  }

  return {
    query,
    results,
    groups,
    status,
    open,
    shortcutLabel,
    load,
  }
}
