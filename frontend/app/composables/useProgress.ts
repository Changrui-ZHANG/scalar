/**
 * Progression de l'apprenant, sans compte : elle vit dans le navigateur, et
 * c'est la seule source de verite des parcours commences et des episodes
 * termines. Chaque parcours a la sienne : commencer TypeScript ne touche pas
 * a JavaScript.
 *
 * Une lecon n'est terminee que sur action explicite, un exercice que si tous
 * ses criteres de verification passent : ouvrir ou executer ne suffit pas.
 */

export interface ProgressState {
  /** Slugs des parcours commences. */
  readonly started: readonly string[]
  /** Cles des episodes termines, par parcours (voir `lessonKey`, `exerciseKey`). */
  readonly completed: Readonly<Record<string, readonly string[]>>
}

type Drafts = Readonly<Record<string, string>>

// v4 : une cle de lecon porte son chapitre, son slug n'etant plus unique dans
// le parcours. Les v3 sont ignorees : leurs cles ne designent plus une lecon.
const STORAGE_KEY = 'scalar:progress:v4'
const DRAFTS_KEY = 'scalar:drafts:v1'

export const EMPTY_PROGRESS: ProgressState = { started: [], completed: {} }

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Le stockage est modifiable a la main : on ne garde que ce qui est bien forme. */
export function parseProgress(raw: string | null): ProgressState {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!isRecord(value)) {
      return EMPTY_PROGRESS
    }
    const completed = isRecord(value.completed)
      ? Object.fromEntries(
          Object.entries(value.completed).filter((entry): entry is [string, string[]] =>
            isStringArray(entry[1]),
          ),
        )
      : {}
    return { started: isStringArray(value.started) ? value.started : [], completed }
  } catch {
    return EMPTY_PROGRESS
  }
}

function parseDrafts(raw: string | null): Drafts {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    return isRecord(value)
      ? Object.fromEntries(
          Object.entries(value).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {}
  } catch {
    return {}
  }
}

/** Commence un parcours ; idempotent. */
export const startTrack = (state: ProgressState, track: string): ProgressState =>
  state.started.includes(track) ? state : { ...state, started: [...state.started, track] }

/** Termine un episode, et commence son parcours au passage ; idempotent. */
export function completeEpisode(state: ProgressState, track: string, key: string): ProgressState {
  const done = state.completed[track] ?? []
  const started = startTrack(state, track)
  return done.includes(key)
    ? started
    : { ...started, completed: { ...started.completed, [track]: [...done, key] } }
}

function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Stockage plein ou bloque : la progression reste valable pour la session.
  }
}

export function useProgress() {
  const state = useState<ProgressState>('progress', () => EMPTY_PROGRESS)
  const drafts = useState<Drafts>('drafts', () => ({}))

  // Le stockage n'existe que dans le navigateur, et peut y etre bloque.
  onMounted(() => {
    try {
      state.value = parseProgress(localStorage.getItem(STORAGE_KEY))
      drafts.value = parseDrafts(localStorage.getItem(DRAFTS_KEY))
    } catch {
      // Lecture refusee : on garde l'etat de la session.
    }
  })

  function update(next: ProgressState): void {
    state.value = next
    store(STORAGE_KEY, next)
  }

  return {
    completedIn: (track: string): readonly string[] => state.value.completed[track] ?? [],
    isStarted: (track: string): boolean => state.value.started.includes(track),
    start: (track: string) => update(startTrack(state.value, track)),
    complete: (track: string, key: string) => update(completeEpisode(state.value, track, key)),
    draft: (key: string): string | undefined => drafts.value[key],
    saveDraft(key: string, code: string): void {
      drafts.value = { ...drafts.value, [key]: code }
      store(DRAFTS_KEY, drafts.value)
    },
  }
}
