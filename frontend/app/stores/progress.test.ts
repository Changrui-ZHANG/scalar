import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { PROGRESS_STORAGE_KEY } from '~/utils/storage'
import { useProgressStore } from './progress'

describe('stores/progress', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('initializes with empty progress', () => {
    const store = useProgressStore()
    expect(store.progress.started).toEqual([])
    expect(store.progress.completed).toEqual({})
    expect(store.startedByRecency).toEqual([])
  })

  it('open adds track to started and sets lastVisited', () => {
    const store = useProgressStore()
    store.open('javascript')

    expect(store.progress.started).toContain('javascript')
    expect(store.progress.lastVisited.javascript).toBeDefined()
    expect(store.startedByRecency).toEqual(['javascript'])

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}')
    expect(saved.started).toContain('javascript')
  })

  it('complete adds keys, returns new keys, and updates completedFor', () => {
    const store = useProgressStore()
    const newKeys = store.complete('javascript', ['lesson:ch1:l1', 'exercise:ch1:e1'])

    expect(newKeys).toEqual(['lesson:ch1:l1', 'exercise:ch1:e1'])
    expect(store.completedFor('javascript')).toEqual(new Set(['lesson:ch1:l1', 'exercise:ch1:e1']))

    // Calling again with same keys returns empty array
    const secondCall = store.complete('javascript', ['lesson:ch1:l1'])
    expect(secondCall).toEqual([])
  })

  it('startedByRecency sorts by lastVisited descending', () => {
    const store = useProgressStore()
    store.open('javascript')
    // wait a tiny bit or mock dates
    store.progress = {
      started: ['javascript', 'typescript'],
      completed: {},
      lastVisited: {
        javascript: '2026-10-20T10:00:00Z',
        typescript: '2026-10-21T10:00:00Z',
      },
    }

    expect(store.startedByRecency).toEqual(['typescript', 'javascript'])
  })

  it('merges with existing localStorage from other tabs before writing', () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        started: ['python'],
        completed: { python: ['lesson:py:intro'] },
        lastVisited: { python: '2026-10-19T00:00:00Z' },
      }),
    )

    const store = useProgressStore()
    store.complete('javascript', ['lesson:js:intro'])

    expect(store.progress.started).toContain('python')
    expect(store.progress.started).toContain('javascript')
    expect(store.completedFor('python').has('lesson:py:intro')).toBe(true)
    expect(store.completedFor('javascript').has('lesson:js:intro')).toBe(true)
  })
})
