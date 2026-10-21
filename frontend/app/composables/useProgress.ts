/**
 * Progression de l'apprenant, sans compte : elle vit dans le navigateur, et
 * c'est la seule source de verite des parcours commences et des episodes
 * termines.
 */

export interface ProgressState {
  readonly started: readonly string[]
  readonly completed: Readonly<Record<string, readonly string[]>>
}

export const EMPTY_PROGRESS: ProgressState = {
  started: [],
  completed: {},
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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
    return {
      started: isStringArray(value.started) ? value.started : [],
      completed,
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

export function completeEpisode(
  state: ProgressState,
  trackSlug: string,
  episodeKey: string,
): ProgressState {
  const currentCompleted = state.completed[trackSlug] ?? []
  const currentStarted = state.started.includes(trackSlug)
    ? state.started
    : [...state.started, trackSlug]

  return {
    ...state,
    started: currentStarted,
    completed: {
      ...state.completed,
      [trackSlug]: currentCompleted.includes(episodeKey)
        ? currentCompleted
        : [...currentCompleted, episodeKey],
    },
  }
}

export function startTrack(state: ProgressState, trackSlug: string): ProgressState {
  if (state.started.includes(trackSlug)) {
    return state
  }
  return {
    ...state,
    started: [...state.started, trackSlug],
  }
}
