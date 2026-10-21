import { getCurrentInstance, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { ExecutionResult } from '@scalar/shared/api'
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import type { SandboxSeed } from '~/types/storage'
import { SANDBOX_SEED_STORAGE_KEY } from '~/utils/storage'
import { usePreferencesStore } from '~/stores/preferences'
import { executeCode } from '~/services/executions'
import { isCodeTooLarge, CODE_TOO_LARGE_MESSAGE, runErrorMessage } from '~/utils/execution'

export interface SandboxRunState {
  readonly language: Ref<ProgrammingLanguage>
  readonly code: Ref<string>
  readonly pending: Ref<boolean>
  readonly result: Ref<ExecutionResult | null>
  readonly error: Ref<string | null>
  readonly seed: Ref<SandboxSeed | null>
  acceptSeed(): void
  dismissSeed(): void
  run(): Promise<void>
}

export function useSandbox(): SandboxRunState {
  const preferences = usePreferencesStore()

  const language = ref<ProgrammingLanguage>(preferences.sandbox?.language ?? 'javascript')
  const code = ref<string>(preferences.sandbox?.code ?? '')
  const pending = ref<boolean>(false)
  const result = ref<ExecutionResult | null>(null)
  const error = ref<string | null>(null)
  const seed = ref<SandboxSeed | null>(null)

  // Sauvegarde des préférences
  watch([language, code], () => {
    preferences.saveSandbox({ language: language.value, code: code.value })
  })

  function initSeed() {
    if (import.meta.client && typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(SANDBOX_SEED_STORAGE_KEY)
        if (raw) {
          sessionStorage.removeItem(SANDBOX_SEED_STORAGE_KEY)
          const parsed = JSON.parse(raw) as SandboxSeed
          if (parsed && typeof parsed.code === 'string') {
            const currentTrimmed = code.value.trim()
            if (
              currentTrimmed === '' ||
              currentTrimmed === '// Écrivez votre code ici' ||
              currentTrimmed === parsed.code.trim()
            ) {
              code.value = parsed.code
              language.value = parsed.language
            } else {
              seed.value = parsed
            }
          }
        }
      } catch {
        // Ignorer les erreurs de sessionStorage
      }
    }
  }

  if (getCurrentInstance()) {
    onMounted(initSeed)
  } else {
    initSeed()
  }

  function acceptSeed(): void {
    if (seed.value) {
      code.value = seed.value.code
      language.value = seed.value.language
      seed.value = null
    }
  }

  function dismissSeed(): void {
    seed.value = null
  }

  async function run(): Promise<void> {
    if (isCodeTooLarge(code.value)) {
      error.value = CODE_TOO_LARGE_MESSAGE
      return
    }

    pending.value = true
    error.value = null
    try {
      const res = await executeCode({
        code: code.value,
        programmingLanguage: language.value,
      })
      result.value = res
    } catch (err) {
      error.value = runErrorMessage(err as Record<string, unknown>, 'run')
    } finally {
      pending.value = false
    }
  }

  return {
    language,
    code,
    pending,
    result,
    error,
    seed,
    acceptSeed,
    dismissSeed,
    run,
  }
}

export function useTryInSandbox(): (code: string, language: ProgrammingLanguage) => Promise<void> {
  return async (code: string, language: ProgrammingLanguage) => {
    if (import.meta.client && typeof sessionStorage !== 'undefined') {
      try {
        const seedData: SandboxSeed = { code, language }
        sessionStorage.setItem(SANDBOX_SEED_STORAGE_KEY, JSON.stringify(seedData))
      } catch {
        // Ignorer
      }
    }
    await navigateTo('/exercices')
  }
}
