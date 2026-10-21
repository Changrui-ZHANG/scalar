import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  HINTS_STORAGE_KEY,
  PLAN_COLLAPSED_STORAGE_KEY,
  SANDBOX_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '~/utils/storage'
import { usePreferencesStore } from './preferences'

describe('stores/preferences', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('manages theme', () => {
    const store = usePreferencesStore()
    expect(store.theme).toBe('system')

    store.setTheme('dark')
    expect(store.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('manages planCollapsed', () => {
    const store = usePreferencesStore()
    expect(store.planCollapsed).toBe(false)

    store.setPlanCollapsed(true)
    expect(store.planCollapsed).toBe(true)
    expect(localStorage.getItem(PLAN_COLLAPSED_STORAGE_KEY)).toBe('true')
  })

  it('manages hints and caps at available', () => {
    const store = usePreferencesStore()
    expect(store.revealedHints('ex1', 3)).toBe(0)

    store.revealHint('ex1', 2)
    expect(store.revealedHints('ex1', 2)).toBe(1)

    store.revealHint('ex1', 2)
    expect(store.revealedHints('ex1', 2)).toBe(2)

    store.revealHint('ex1', 2)
    expect(store.revealedHints('ex1', 2)).toBe(2)

    const raw = JSON.parse(localStorage.getItem(HINTS_STORAGE_KEY) ?? '{}')
    expect(raw.ex1).toBe(2)
  })

  it('saves and reads sandbox state', () => {
    const store = usePreferencesStore()
    expect(store.sandbox).toBeNull()

    store.saveSandbox({ language: 'typescript', code: 'console.log(42)' })
    expect(store.sandbox).toEqual({ language: 'typescript', code: 'console.log(42)' })

    const raw = JSON.parse(localStorage.getItem(SANDBOX_STORAGE_KEY) ?? '{}')
    expect(raw.code).toBe('console.log(42)')
  })
})
