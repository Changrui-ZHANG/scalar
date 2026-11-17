const CHECK_TOASTS = {
  passed: { title: 'Solution de l’IA vérifiée : relisez avant de publier.', color: 'success' },
  failed: { title: 'La solution de l’IA échoue à ses cas de test : à corriger.', color: 'warning' },
  unchecked: { title: 'Moteur injoignable : vérifiez la solution plus tard.', color: 'warning' },
} as const

/** Brouillon redige par l'IA a partir d'un titre ; null et message d'erreur en cas d'echec. */
export function useExerciseGeneration(chapterId: number) {
  const store = useContentStore()
  const toast = useToast()
  const generating = ref(false)

  async function generate(title: string): Promise<Exercise | null> {
    generating.value = true
    try {
      const result = await store.generateExercise(chapterId, title.trim())
      if (!result.ok) {
        toast.add({ title: result.message, color: 'error' })
        return null
      }
      const check = result.data.solutionCheck
      toast.add(CHECK_TOASTS[check === null ? 'unchecked' : check.passed ? 'passed' : 'failed'])
      return result.data.exercise
    } finally {
      generating.value = false
    }
  }

  return { generate, generating }
}
