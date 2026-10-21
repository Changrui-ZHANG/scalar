import { hashText } from '@scalar/shared/hash'
import {
  computed,
  getCurrentInstance,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { DraftStatus } from '~/types/exercise'
import type { StoredDraft } from '~/types/storage'
import { useDraftsStore } from '~/stores/drafts'

export interface DraftState {
  readonly code: Ref<string>
  readonly status: Ref<DraftStatus>
  readonly starterChanged: ComputedRef<boolean>
  reset(): void
  flush(): void
}

export function useDraft(
  key: MaybeRefOrGetter<string>,
  starterCode: MaybeRefOrGetter<string>,
): DraftState {
  const draftsStore = useDraftsStore()
  const initialStarter = toValue(starterCode)

  const code = ref<string>(initialStarter)
  const status = ref<DraftStatus>('idle')
  const storedDraft = ref<StoredDraft | null>(null)

  // Initialisation immédiate ou au montage
  function init(): void {
    draftsStore.migrateLegacy()
    const currentKey = toValue(key)
    const existing = draftsStore.get(currentKey)
    if (existing) {
      storedDraft.value = existing
      code.value = existing.code
    } else {
      code.value = toValue(starterCode)
    }
  }

  init()
  if (getCurrentInstance()) {
    onMounted(init)
  }

  const starterChanged = computed<boolean>(() => {
    if (!storedDraft.value || storedDraft.value.starterHash === null) {
      return false
    }
    const currentStarter = toValue(starterCode)
    return storedDraft.value.starterHash !== hashText(currentStarter)
  })

  function saveCurrentDraft(): void {
    const currentKey = toValue(key)
    const currentCode = code.value
    const currentStarter = toValue(starterCode)

    // Si le code est identique au starter, on ne stocke rien s'il n'y avait pas déjà de brouillon
    if (currentCode === currentStarter && !storedDraft.value) {
      status.value = 'idle'
      return
    }

    const draftData: StoredDraft = {
      code: currentCode,
      starterHash: hashText(currentStarter),
    }

    const success = draftsStore.save(currentKey, draftData)
    if (success) {
      storedDraft.value = draftData
      status.value = 'saved'
    } else {
      status.value = 'failed'
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function flush(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    saveCurrentDraft()
  }

  function reset(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    const currentKey = toValue(key)
    const starter = toValue(starterCode)
    code.value = starter
    draftsStore.remove(currentKey)
    storedDraft.value = null
    status.value = 'idle'
  }

  // Surveillance des modifications de code avec anti-rebond 500 ms
  watch(code, (newCode) => {
    const currentStarter = toValue(starterCode)
    if (newCode === currentStarter && !storedDraft.value) {
      status.value = 'idle'
      return
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      saveCurrentDraft()
    }, 500)
  })

  if (typeof window !== 'undefined') {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    const onPageHide = () => {
      flush()
    }

    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    if (getCurrentInstance()) {
      onUnmounted(() => {
        if (debounceTimer) clearTimeout(debounceTimer)
        window.removeEventListener('pagehide', onPageHide)
        document.removeEventListener('visibilitychange', onVisibilityChange)
      })
    }
  }

  return {
    code,
    status,
    starterChanged,
    reset,
    flush,
  }
}
