import type { Track } from '../entity/track.entity.ts'

const DATE = new Date('2026-09-27T00:00:00Z')
const published = { status: 'published', firstPublishedAt: DATE } as const
const stamps = { createdAt: DATE, updatedAt: DATE }

export const TRACKS: readonly Track[] = [
  {
    id: 1,
    slug: 'javascript',
    name: 'JavaScript',
    position: 1,
    summary: 'Le point de départ : variables, conditions, boucles, fonctions.',
    programmingLanguage: 'javascript',
    prerequisiteTrackId: null,
    ...published,
    ...stamps,
  },
  {
    id: 2,
    slug: 'typescript',
    name: 'TypeScript',
    position: 2,
    summary: 'JavaScript avec des types vérifiés. Suppose les bases de JavaScript.',
    programmingLanguage: 'typescript',
    prerequisiteTrackId: 1,
    ...published,
    ...stamps,
  },
  {
    id: 3,
    slug: 'conception',
    name: 'Conception',
    position: 3,
    summary: 'Bien nommer, bien découper : les principes qui valent quel que soit le langage.',
    programmingLanguage: null,
    prerequisiteTrackId: null,
    ...published,
    ...stamps,
  },
]
