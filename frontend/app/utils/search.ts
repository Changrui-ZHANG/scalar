import type { TrackView } from '@scalar/shared/api'
import type { SearchEntry, SearchEntryKind, SearchGroup, SearchResult } from '~/types/search'

export const SEARCH_MIN_LENGTH = 2
export const SEARCH_DEBOUNCE_MS = 200
export const SEARCH_GROUP_LIMIT = 8 // résultats par parcours dans la recherche rapide

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export const SEARCH_KIND_ICONS: Readonly<Record<SearchEntryKind, string>> = {
  track: 'lucide:layers',
  chapter: 'lucide:folder',
  lesson: 'lucide:book-open',
  heading: 'lucide:hash',
  exercise: 'lucide:code-xml',
}

export function buildSearchIndex(views: readonly TrackView[]): readonly SearchEntry[] {
  const entries: SearchEntry[] = []

  for (const view of views) {
    const trackSlug = view.track.slug
    const trackName = view.track.name

    // 1. Parcours
    entries.push({
      kind: 'track',
      trackSlug,
      trackName,
      chapterNumber: null,
      title: trackName,
      haystack: normalizeSearchText(trackName),
      path: `/parcours/${trackSlug}`,
    })

    for (const chapter of view.chapters) {
      const chapterNumber = chapter.number
      const chapterSlug = chapter.slug
      const chapterTitle = chapter.title

      // 2. Chapitre
      entries.push({
        kind: 'chapter',
        trackSlug,
        trackName,
        chapterNumber,
        title: chapterTitle,
        haystack: normalizeSearchText(chapterTitle),
        path: `/parcours/${trackSlug}#${chapterSlug}`,
      })

      // 3. Leçons et intertitres (headings)
      for (const lesson of chapter.lessons) {
        entries.push({
          kind: 'lesson',
          trackSlug,
          trackName,
          chapterNumber,
          title: lesson.title,
          haystack: normalizeSearchText(`${lesson.title} ${lesson.summary}`),
          path: `/parcours/${trackSlug}/${chapterSlug}/lecon/${lesson.slug}`,
        })

        if (lesson.headings) {
          for (const heading of lesson.headings) {
            entries.push({
              kind: 'heading',
              trackSlug,
              trackName,
              chapterNumber,
              title: heading.text,
              haystack: normalizeSearchText(heading.text),
              path: `/parcours/${trackSlug}/${chapterSlug}/lecon/${lesson.slug}#${heading.id}`,
            })
          }
        }
      }

      // 4. Exercices
      for (const exercise of chapter.exercises) {
        entries.push({
          kind: 'exercise',
          trackSlug,
          trackName,
          chapterNumber,
          title: exercise.title,
          haystack: normalizeSearchText(exercise.title),
          path: `/parcours/${trackSlug}/${chapterSlug}/${exercise.slug}`,
        })
      }
    }
  }

  return entries
}

export function searchEntries(index: readonly SearchEntry[], query: string): readonly SearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < SEARCH_MIN_LENGTH) {
    return []
  }

  const words = normalizedQuery.split(' ').filter(Boolean)
  if (words.length === 0) {
    return []
  }

  const matching: SearchResult[] = []

  for (const entry of index) {
    const matchesAllWords = words.every((word) => entry.haystack.includes(word))
    if (!matchesAllWords) {
      continue
    }

    const normalizedTitle = normalizeSearchText(entry.title)
    let score = 1
    if (normalizedTitle.startsWith(normalizedQuery)) {
      score = 3
    } else if (normalizedTitle.includes(normalizedQuery)) {
      score = 2
    }

    matching.push({ entry, score })
  }

  // Stable sort : le plus grand score d'abord ; à égalité, ordre du fil préservé
  return matching.sort((a, b) => b.score - a.score)
}

export function groupByTrack(
  results: readonly SearchResult[],
  limit: number = SEARCH_GROUP_LIMIT
): readonly SearchGroup[] {
  const groupsMap = new Map<string, { trackSlug: string; trackName: string; results: SearchResult[] }>()

  for (const result of results) {
    const slug = result.entry.trackSlug
    let group = groupsMap.get(slug)
    if (!group) {
      group = {
        trackSlug: slug,
        trackName: result.entry.trackName,
        results: [],
      }
      groupsMap.set(slug, group)
    }

    if (group.results.length < limit) {
      group.results.push(result)
    }
  }

  return Array.from(groupsMap.values())
}
