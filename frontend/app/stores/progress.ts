import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { StoredProgress } from '~/types/storage'
import { EMPTY_PROGRESS, PROGRESS_STORAGE_KEY, mergeProgress, parseProgress } from '~/utils/storage'

export const useProgressStore = defineStore('progress', () => {
  const progress = ref<StoredProgress>(EMPTY_PROGRESS)

  // Initialisation côté client
  // Lecture du stockage du navigateur. Appelée une seule fois, au montage de
  // l'application (app.vue) : le rendu serveur et l'hydratation se font avec
  // l'état vide, comme le demande specs-site.md § 9 (pas de saut à l'hydratation).
  let loaded = false
  function loadFromStorage(): void {
    if (loaded) return
    loaded = true
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
      if (stored) {
        progress.value = parseProgress(stored)
      }
    } catch {
      // Stockage inaccessible
    }

    window.addEventListener('storage', (event) => {
      if (event.key === PROGRESS_STORAGE_KEY) {
        progress.value = parseProgress(event.newValue)
      }
    })
  }

  const startedByRecency = computed<readonly string[]>(() => {
    const list = [...progress.value.started]
    return list.sort((a, b) => {
      const dateA = progress.value.lastVisited[a]
      const dateB = progress.value.lastVisited[b]
      if (dateA && dateB) return dateB.localeCompare(dateA)
      if (dateA) return -1
      if (dateB) return 1
      return 0
    })
  })

  function completedFor(track: string): ReadonlySet<string> {
    return new Set(progress.value.completed[track] ?? [])
  }

  function open(track: string): void {
    const now = new Date().toISOString()
    const updateLocal: StoredProgress = {
      started: [track],
      completed: {},
      lastVisited: { [track]: now },
    }

    let merged = mergeProgress(progress.value, updateLocal)

    if (typeof localStorage !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem(PROGRESS_STORAGE_KEY)
        const stored = parseProgress(storedRaw)
        merged = mergeProgress(stored, updateLocal)
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(merged))
      } catch {
        // Stockage plein ou bloqué
      }
    }

    progress.value = merged
  }

  function complete(track: string, keys: readonly string[]): readonly string[] {
    const now = new Date().toISOString()
    let storedDone: readonly string[] = progress.value.completed[track] ?? []

    if (typeof localStorage !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem(PROGRESS_STORAGE_KEY)
        const stored = parseProgress(storedRaw)
        storedDone = stored.completed[track] ?? []
      } catch {
        // Stockage plein ou bloqué
      }
    }

    const doneSet = new Set(storedDone)
    const newKeys = keys.filter((key) => !doneSet.has(key))

    const updateLocal: StoredProgress = {
      started: [track],
      completed: { [track]: keys },
      lastVisited: { [track]: now },
    }

    let merged = mergeProgress(progress.value, updateLocal)

    if (typeof localStorage !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem(PROGRESS_STORAGE_KEY)
        const stored = parseProgress(storedRaw)
        merged = mergeProgress(stored, updateLocal)
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(merged))
      } catch {
        // Stockage plein ou bloqué
      }
    }

    progress.value = merged
    return newKeys
  }

  return {
    loadFromStorage,
    progress,
    startedByRecency,
    completedFor,
    open,
    complete,
  }
})
