/**
 * Executer et verifier sont deux actions distinctes : l'execution montre ce
 * que le programme produit, seule la verification juge la solution. Le code
 * ne tourne jamais dans le navigateur, toujours dans le moteur isole.
 */

const UNREACHABLE =
  'Le service d’exécution n’a pas répondu. Vérifiez votre connexion puis réessayez.'

/** Delai du navigateur, au-dela de celui du moteur (5 s) et de son demarrage. */
const REQUEST_TIMEOUT_MS = 20_000

export function useExecution() {
  const result = ref<ExecutionResult | null>(null)
  const error = ref('')
  const running = ref(false)

  /** Execute `code` ; sans langage, le moteur le lit comme du JavaScript. */
  async function run(code: string, language?: string): Promise<void> {
    if (running.value || code.trim() === '') {
      return
    }
    running.value = true
    error.value = ''
    result.value = null
    try {
      const response = await $fetch<ApiResponse<ExecutionResult>>(apiUrl('/executions'), {
        method: 'POST',
        body: { code, language },
        timeout: REQUEST_TIMEOUT_MS,
      })
      result.value = response.data
      error.value = response.data ? '' : (response.error ?? UNREACHABLE)
    } catch (err: unknown) {
      error.value = apiErrorMessage(err, UNREACHABLE)
    } finally {
      running.value = false
    }
  }

  return { result, error, running, run }
}

/** Correction d'un exercice par l'API ; `path` est son chemin sous /languages. */
export function useExerciseValidation(path: () => string) {
  const verification = ref<VerificationResult | null>(null)
  const error = ref('')
  const verifying = ref(false)

  async function verify(code: string): Promise<VerificationResult | null> {
    if (verifying.value || code.trim() === '') {
      return null
    }
    verifying.value = true
    error.value = ''
    verification.value = null
    try {
      const response = await $fetch<ApiResponse<VerificationResult>>(
        apiUrl(`${path()}/verifications`),
        { method: 'POST', body: { code }, timeout: REQUEST_TIMEOUT_MS },
      )
      verification.value = response.data
      error.value = response.data ? '' : (response.error ?? UNREACHABLE)
    } catch (err: unknown) {
      error.value = apiErrorMessage(err, UNREACHABLE)
    } finally {
      verifying.value = false
    }
    return verification.value
  }

  return { verification, error, verifying, verify }
}
