import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SandboxState, StoredHints, ThemeChoice } from '~/types/storage'
import {
  HINTS_STORAGE_KEY,
  PLAN_COLLAPSED_STORAGE_KEY,
  SANDBOX_STORAGE_KEY,
  THEME_STORAGE_KEY,
  parseHints,
  parsePlanCollapsed,
  parseSandbox,
  parseTheme,
} from '~/utils/storage'

export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<ThemeChoice>('system')
  const planCollapsed = ref<boolean>(false)
  const hints = ref<StoredHints>({})
  const sandbox = ref<SandboxState | null>(null)

  if (import.meta.client && typeof window !== 'undefined') {
    try {
      theme.value = parseTheme(localStorage.getItem(THEME_STORAGE_KEY))
      planCollapsed.value = parsePlanCollapsed(localStorage.getItem(PLAN_COLLAPSED_STORAGE_KEY))
      hints.value = parseHints(localStorage.getItem(HINTS_STORAGE_KEY))
      sandbox.value = parseSandbox(localStorage.getItem(SANDBOX_STORAGE_KEY))
    } catch {
      // Stockage inaccessible
    }

    window.addEventListener('storage', (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        theme.value = parseTheme(event.newValue)
      } else if (event.key === PLAN_COLLAPSED_STORAGE_KEY) {
        planCollapsed.value = parsePlanCollapsed(event.newValue)
      } else if (event.key === HINTS_STORAGE_KEY) {
        hints.value = parseHints(event.newValue)
      } else if (event.key === SANDBOX_STORAGE_KEY) {
        sandbox.value = parseSandbox(event.newValue)
      }
    })
  }

  function revealedHints(key: string, available: number): number {
    const count = hints.value[key] ?? 0
    return Math.min(count, available)
  }

  function setTheme(choice: ThemeChoice): void {
    theme.value = choice
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, choice)
      } catch {
        // Ignoré
      }
    }
  }

  function setPlanCollapsed(collapsed: boolean): void {
    planCollapsed.value = collapsed
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(PLAN_COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed))
      } catch {
        // Ignoré
      }
    }
  }

  function revealHint(key: string, available: number): void {
    let currentStored: StoredHints = { ...hints.value }
    if (typeof localStorage !== 'undefined') {
      try {
        currentStored = parseHints(localStorage.getItem(HINTS_STORAGE_KEY))
      } catch {
        // Ignoré
      }
    }

    const currentCount = currentStored[key] ?? 0
    const nextCount = Math.min(currentCount + 1, available)
    const next: StoredHints = { ...currentStored, [key]: nextCount }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignoré
      }
    }

    hints.value = next
  }

  function saveSandbox(state: SandboxState): void {
    sandbox.value = state
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Ignoré
      }
    }
  }

  return {
    theme,
    planCollapsed,
    hints,
    sandbox,
    revealedHints,
    setTheme,
    setPlanCollapsed,
    revealHint,
    saveSandbox,
  }
})
