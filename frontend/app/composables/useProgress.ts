/**
 * Progression de l'apprenant, sans compte : elle vit dans le navigateur.
 *
 * Etats d'un exercice : a faire -> commence (code modifie) -> tente (au moins
 * une execution) -> reussi. Un exercice reussi le reste.
 */

export type ExerciseStatus = 'todo' | 'started' | 'attempted' | 'passed'

type StoredStatus = Exclude<ExerciseStatus, 'todo'>

interface ExerciseProgress {
  readonly status: StoredStatus
  readonly code: string
}

type ProgressMap = Readonly<Record<string, ExerciseProgress>>

const STORAGE_KEY = 'scalar:progress:v1'
const STORED: readonly string[] = ['started', 'attempted', 'passed']
const RANK: Readonly<Record<ExerciseStatus, number>> = {
  todo: 0,
  started: 1,
  attempted: 2,
  passed: 3,
}

export const STATUS_LABELS: Readonly<Record<ExerciseStatus, string>> = {
  todo: 'À faire',
  started: 'Commencé',
  attempted: 'Tenté',
  passed: 'Réussi',
}

/** Le stockage est modifiable a la main : on ne garde que les entrees bien formees. */
export function parseProgress(raw: string | null): ProgressMap {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(value).filter(([, p]) => {
        const entry = p as Partial<ExerciseProgress> | null
        return typeof entry?.code === 'string' && STORED.includes(String(entry.status))
      }),
    ) as ProgressMap
  } catch {
    return {}
  }
}

/** Ne jamais retrograder : un exercice reussi puis rate reste reussi. */
export function mergeStatus(current: ExerciseStatus, next: StoredStatus): StoredStatus {
  return RANK[current] > RANK[next] ? (current as StoredStatus) : next
}

export function useProgress() {
  const progress = useState<ProgressMap>('progress', () => ({}))

  // Le stockage n'existe que dans le navigateur, et peut y etre bloque.
  onMounted(() => {
    try {
      progress.value = parseProgress(localStorage.getItem(STORAGE_KEY))
    } catch {
      progress.value = {}
    }
  })

  function statusOf(slug: string): ExerciseStatus {
    return progress.value[slug]?.status ?? 'todo'
  }

  function write(slug: string, status: StoredStatus, code: string): void {
    progress.value = {
      ...progress.value,
      [slug]: { status: mergeStatus(statusOf(slug), status), code },
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress.value))
    } catch {
      // Stockage plein ou bloque : la progression reste valable pour la session.
    }
  }

  return {
    statusOf,
    savedCode: (slug: string): string | undefined => progress.value[slug]?.code,
    saveCode: (slug: string, code: string) => write(slug, 'started', code),
    markAttempted: (slug: string, code: string) => write(slug, 'attempted', code),
  }
}
