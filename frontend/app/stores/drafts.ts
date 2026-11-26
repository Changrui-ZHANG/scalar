import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StoredDraft, StoredDrafts } from '~/types/storage'
import {
  DRAFTS_STORAGE_KEY,
  LEGACY_DRAFTS_STORAGE_KEY,
  convertLegacyDrafts,
  parseDrafts,
  withDraft,
} from '~/utils/storage'

export const useDraftsStore = defineStore('drafts', () => {
  const drafts = ref<StoredDrafts>({})

  // Lecture du stockage du navigateur. Appelée une seule fois, au montage de
  // l'application (app.vue) : le rendu serveur et l'hydratation se font avec
  // l'état vide, comme le demande specs-site.md § 9 (pas de saut à l'hydratation).
  let loaded = false
  function loadFromStorage(): void {
    if (loaded) return
    loaded = true
    try {
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
      if (stored) {
        drafts.value = parseDrafts(stored)
      }
    } catch {
      // Stockage inaccessible
    }

    window.addEventListener('storage', (event) => {
      if (event.key === DRAFTS_STORAGE_KEY) {
        drafts.value = parseDrafts(event.newValue)
      }
    })
  }

  function get(key: string): StoredDraft | null {
    return drafts.value[key] ?? null
  }

  function save(key: string, draft: StoredDraft): boolean {
    let next: StoredDrafts = withDraft(drafts.value, key, draft)

    if (typeof localStorage !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem(DRAFTS_STORAGE_KEY)
        const stored = parseDrafts(storedRaw)
        next = withDraft(stored, key, draft)
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Stockage plein ou bloqué
        return false
      }
    }

    drafts.value = next
    return true
  }

  function remove(key: string): void {
    let next: StoredDrafts = withDraft(drafts.value, key, null)

    if (typeof localStorage !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem(DRAFTS_STORAGE_KEY)
        const stored = parseDrafts(storedRaw)
        next = withDraft(stored, key, null)
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignoré
      }
    }

    drafts.value = next
  }

  function migrateLegacy(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const legacyRaw = localStorage.getItem(LEGACY_DRAFTS_STORAGE_KEY)
      if (legacyRaw) {
        const converted = convertLegacyDrafts(legacyRaw)
        const storedRaw = localStorage.getItem(DRAFTS_STORAGE_KEY)
        const stored = parseDrafts(storedRaw)
        const merged: StoredDrafts = { ...converted, ...stored }

        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(merged))
        localStorage.removeItem(LEGACY_DRAFTS_STORAGE_KEY)
        drafts.value = merged
      }
    } catch {
      // Ignoré
    }
  }

  return {
    loadFromStorage,
    drafts,
    get,
    save,
    remove,
    migrateLegacy,
  }
})
