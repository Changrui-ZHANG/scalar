import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { ThemeChoice } from '~/types/storage'
import { THEME_STORAGE_KEY } from '~/utils/storage'
import { usePreferencesStore } from '~/stores/preferences'

export const THEME_INIT_SCRIPT = `try {
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (t === 'light' || t === 'dark') {
    document.documentElement.setAttribute('data-theme', t);
  }
} catch (e) {}`

export interface ThemeState {
  readonly choice: ComputedRef<ThemeChoice>
  readonly label: ComputedRef<string>
  cycle(): void
}

export function useTheme(): ThemeState {
  const preferences = usePreferencesStore()

  const choice = computed<ThemeChoice>(() => preferences.theme)

  const label = computed(() => {
    switch (choice.value) {
      case 'light':
        return 'Thème : clair'
      case 'dark':
        return 'Thème : sombre'
      case 'system':
      default:
        return 'Thème : système'
    }
  })

  function cycle(): void {
    const next: ThemeChoice =
      choice.value === 'system' ? 'light' : choice.value === 'light' ? 'dark' : 'system'
    preferences.setTheme(next)

    if (import.meta.client && typeof document !== 'undefined') {
      if (next === 'light' || next === 'dark') {
        document.documentElement.setAttribute('data-theme', next)
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    }
  }

  return {
    choice,
    label,
    cycle,
  }
}
