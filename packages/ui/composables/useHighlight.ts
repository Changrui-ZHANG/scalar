import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { hashText } from '@scalar/shared/hash'
import { MAX_HIGHLIGHT_BLOCKS } from '@scalar/shared/limits'
import type {
  HighlightedLine,
  HighlightResponse,
  HighlightSource,
} from '../types/highlight'

export interface HighlightState {
  readonly lines: ComputedRef<readonly (readonly HighlightedLine[] | null)[]>
}

export function useHighlight(
  blocks: MaybeRefOrGetter<readonly HighlightSource[]>
): HighlightState & Promise<HighlightState> {
  const rawBlocks = toValue(blocks)

  if (!rawBlocks || rawBlocks.length === 0) {
    const emptyState: HighlightState = {
      lines: computed(() => []),
    }
    const resolvedPromise = Promise.resolve(emptyState)
    return Object.assign(resolvedPromise, emptyState)
  }

  const key = `highlight:${hashText(JSON.stringify(rawBlocks))}`

  const asyncData = useAsyncData<readonly HighlightResponse[]>(
    key,
    async () => {
      const chunks: HighlightSource[][] = []
      for (let i = 0; i < rawBlocks.length; i += MAX_HIGHLIGHT_BLOCKS) {
        chunks.push(rawBlocks.slice(i, i + MAX_HIGHLIGHT_BLOCKS) as HighlightSource[])
      }

      return Promise.all(
        chunks.map((chunk) =>
          $fetch<HighlightResponse>('/api/highlight', {
            method: 'POST',
            body: { blocks: chunk },
          })
        )
      )
    },
    {
      server: true,
      lazy: false,
    }
  )

  const lines = computed<readonly (readonly HighlightedLine[] | null)[]>(() => {
    if (!asyncData.data.value) {
      return rawBlocks.map(() => null)
    }
    const allBlocks = asyncData.data.value.flatMap((res) => res.blocks)
    return allBlocks.map((b) => b.lines)
  })

  const state: HighlightState = { lines }
  const promise = asyncData.then(() => state)

  return Object.assign(promise, state)
}
