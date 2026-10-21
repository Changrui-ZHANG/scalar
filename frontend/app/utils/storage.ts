import type {
  SandboxSeed,
  SandboxState,
  StoredDraft,
  StoredDrafts,
  StoredHints,
  StoredProgress,
  ThemeChoice,
} from '~/types/storage'

export const PROGRESS_STORAGE_KEY = 'scalar:progress:v4'
export const DRAFTS_STORAGE_KEY = 'scalar:drafts:v2'
export const LEGACY_DRAFTS_STORAGE_KEY = 'scalar:drafts:v1'
export const HINTS_STORAGE_KEY = 'scalar:hints:v1'
export const SANDBOX_STORAGE_KEY = 'scalar:sandbox:v1'
export const THEME_STORAGE_KEY = 'scalar:theme:v1'
export const PLAN_COLLAPSED_STORAGE_KEY = 'scalar:plan-collapsed:v1'
export const SANDBOX_SEED_STORAGE_KEY = 'scalar:sandbox-seed:v1'

export const EMPTY_PROGRESS: StoredProgress = {
  started: [],
  completed: {},
  lastVisited: {},
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

const isStringArray = (val: unknown): val is string[] =>
  Array.isArray(val) && val.every((item) => typeof item === 'string')

export function parseProgress(raw: string | null): StoredProgress {
  if (!raw) return EMPTY_PROGRESS
  try {
    const val: unknown = JSON.parse(raw)
    if (!isRecord(val)) return EMPTY_PROGRESS

    const started = isStringArray(val.started) ? val.started : []

    const completed: Record<string, readonly string[]> = {}
    if (isRecord(val.completed)) {
      for (const [track, keys] of Object.entries(val.completed)) {
        if (isStringArray(keys)) {
          completed[track] = keys
        }
      }
    }

    const lastVisited: Record<string, string> = {}
    if (isRecord(val.lastVisited)) {
      for (const [track, date] of Object.entries(val.lastVisited)) {
        if (typeof date === 'string') {
          lastVisited[track] = date
        }
      }
    }

    return { started, completed, lastVisited }
  } catch {
    return EMPTY_PROGRESS
  }
}

export function mergeProgress(stored: StoredProgress, local: StoredProgress): StoredProgress {
  const startedSet = new Set<string>()
  for (const s of stored.started) startedSet.add(s)
  for (const s of local.started) startedSet.add(s)
  const started = Array.from(startedSet)

  const allTracks = new Set<string>([
    ...Object.keys(stored.completed),
    ...Object.keys(local.completed),
    ...Object.keys(stored.lastVisited),
    ...Object.keys(local.lastVisited),
    ...started,
  ])

  const completed: Record<string, readonly string[]> = {}
  const lastVisited: Record<string, string> = {}

  for (const track of allTracks) {
    const storedDone = stored.completed[track] ?? []
    const localDone = local.completed[track] ?? []
    if (storedDone.length > 0 || localDone.length > 0) {
      const doneSet = new Set<string>()
      for (const k of storedDone) doneSet.add(k)
      for (const k of localDone) doneSet.add(k)
      completed[track] = Array.from(doneSet)
    }

    const storedDate = stored.lastVisited[track]
    const localDate = local.lastVisited[track]
    if (storedDate && localDate) {
      lastVisited[track] = storedDate >= localDate ? storedDate : localDate
    } else if (storedDate) {
      lastVisited[track] = storedDate
    } else if (localDate) {
      lastVisited[track] = localDate
    }
  }

  return { started, completed, lastVisited }
}

export function parseDrafts(raw: string | null): StoredDrafts {
  if (!raw) return {}
  try {
    const val: unknown = JSON.parse(raw)
    if (!isRecord(val)) return {}

    const result: Record<string, StoredDraft> = {}
    for (const [key, item] of Object.entries(val)) {
      if (isRecord(item) && typeof item.code === 'string') {
        const starterHash = typeof item.starterHash === 'string' ? item.starterHash : null
        result[key] = {
          code: item.code,
          starterHash,
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function convertLegacyDrafts(raw: string | null): StoredDrafts {
  if (!raw) return {}
  try {
    const val: unknown = JSON.parse(raw)
    if (!isRecord(val)) return {}

    const result: Record<string, StoredDraft> = {}
    for (const [key, codeVal] of Object.entries(val)) {
      if (typeof codeVal === 'string') {
        // v1 key format could have been "<track>/exercise:<chapter>:<slug>" or "<track>:exercise:..."
        const normalizedKey = key.replace('/exercise:', ':exercise:')
        result[normalizedKey] = {
          code: codeVal,
          starterHash: null,
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function withDraft(
  stored: StoredDrafts,
  key: string,
  draft: StoredDraft | null,
): StoredDrafts {
  if (draft === null) {
    const { [key]: _removed, ...rest } = stored
    return rest
  }
  return { ...stored, [key]: draft }
}

export function parseTheme(raw: string | null): ThemeChoice {
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw
  }
  return 'system'
}

export function parsePlanCollapsed(raw: string | null): boolean {
  if (raw === 'true') return true
  if (raw === 'false') return false
  try {
    return JSON.parse(raw ?? 'false') === true
  } catch {
    return false
  }
}

export function parseHints(raw: string | null): StoredHints {
  if (!raw) return {}
  try {
    const val: unknown = JSON.parse(raw)
    if (!isRecord(val)) return {}

    const result: Record<string, number> = {}
    for (const [key, num] of Object.entries(val)) {
      if (typeof num === 'number' && Number.isInteger(num) && num >= 0) {
        result[key] = num
      }
    }
    return result
  } catch {
    return {}
  }
}

export function parseSandbox(raw: string | null): SandboxState | null {
  if (!raw) return null
  try {
    const val: unknown = JSON.parse(raw)
    if (
      isRecord(val) &&
      typeof val.code === 'string' &&
      (val.language === 'javascript' || val.language === 'typescript')
    ) {
      return { language: val.language, code: val.code }
    }
    return null
  } catch {
    return null
  }
}

export function parseSandboxSeed(raw: string | null): SandboxSeed | null {
  if (!raw) return null
  try {
    const val: unknown = JSON.parse(raw)
    if (
      isRecord(val) &&
      typeof val.code === 'string' &&
      (val.language === 'javascript' || val.language === 'typescript')
    ) {
      return { language: val.language, code: val.code }
    }
    return null
  } catch {
    return null
  }
}
