import { hashText } from '@scalar/shared/hash'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDraftsStore } from '~/stores/drafts'
import { useDraft } from './useDraft'

describe('composables/useDraft', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  it('restores existing draft if present', () => {
    const draftsStore = useDraftsStore()
    draftsStore.save('js:exercise:ch1:e1', {
      code: 'console.log("draft")',
      starterHash: hashText('console.log("starter")'),
    })

    const draft = useDraft('js:exercise:ch1:e1', 'console.log("starter")')
    expect(draft.code.value).toBe('console.log("draft")')
    expect(draft.starterChanged.value).toBe(false)
  })

  it('detects when starter code has changed', () => {
    const draftsStore = useDraftsStore()
    draftsStore.save('js:exercise:ch1:e1', {
      code: 'console.log("draft")',
      starterHash: 'old_starter_hash',
    })

    const draft = useDraft('js:exercise:ch1:e1', 'console.log("new starter")')
    expect(draft.starterChanged.value).toBe(true)
  })

  it('debounces saving draft after 500ms', async () => {
    const draftsStore = useDraftsStore()
    const draft = useDraft('js:exercise:ch1:e1', 'start')

    draft.code.value = 'start modified'
    await nextTick()
    expect(draftsStore.get('js:exercise:ch1:e1')).toBeNull()

    vi.advanceTimersByTime(500)
    expect(draftsStore.get('js:exercise:ch1:e1')?.code).toBe('start modified')
    expect(draft.status.value).toBe('saved')
  })

  it('flush saves immediately without waiting for timer', () => {
    const draftsStore = useDraftsStore()
    const draft = useDraft('js:exercise:ch1:e1', 'start')

    draft.code.value = 'flush test'
    draft.flush()

    expect(draftsStore.get('js:exercise:ch1:e1')?.code).toBe('flush test')
  })

  it('reset reverts to starter and removes draft from store', () => {
    const draftsStore = useDraftsStore()
    const draft = useDraft('js:exercise:ch1:e1', 'starter code')

    draft.code.value = 'modified'
    draft.flush()
    expect(draftsStore.get('js:exercise:ch1:e1')).not.toBeNull()

    draft.reset()
    expect(draft.code.value).toBe('starter code')
    expect(draftsStore.get('js:exercise:ch1:e1')).toBeNull()
  })
})
