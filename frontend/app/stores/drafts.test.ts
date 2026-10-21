import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { DRAFTS_STORAGE_KEY, LEGACY_DRAFTS_STORAGE_KEY } from '~/utils/storage'
import { useDraftsStore } from './drafts'

describe('stores/drafts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('saves and retrieves drafts', () => {
    const store = useDraftsStore()
    const ok = store.save('js:exercise:ch1:ex1', {
      code: 'let a = 1;',
      starterHash: 'hash123',
    })

    expect(ok).toBe(true)
    expect(store.get('js:exercise:ch1:ex1')).toEqual({
      code: 'let a = 1;',
      starterHash: 'hash123',
    })

    const raw = JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '{}')
    expect(raw['js:exercise:ch1:ex1']).toBeDefined()
  })

  it('remove deletes only the specified draft', () => {
    const store = useDraftsStore()
    store.save('k1', { code: 'c1', starterHash: null })
    store.save('k2', { code: 'c2', starterHash: null })

    store.remove('k1')
    expect(store.get('k1')).toBeNull()
    expect(store.get('k2')).not.toBeNull()

    const raw = JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '{}')
    expect(raw.k1).toBeUndefined()
    expect(raw.k2).toBeDefined()
  })

  it('migrateLegacy converts v1 drafts and deletes legacy key', () => {
    localStorage.setItem(
      LEGACY_DRAFTS_STORAGE_KEY,
      JSON.stringify({
        'javascript/exercise:variables:swap': 'let [a, b] = [b, a]',
      }),
    )

    const store = useDraftsStore()
    store.migrateLegacy()

    expect(localStorage.getItem(LEGACY_DRAFTS_STORAGE_KEY)).toBeNull()
    expect(store.get('javascript:exercise:variables:swap')).toEqual({
      code: 'let [a, b] = [b, a]',
      starterHash: null,
    })
  })
})
