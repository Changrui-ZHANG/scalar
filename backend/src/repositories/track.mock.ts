import type { Track } from '../db/schema.ts'

/** Donnees fictives : les parcours proposes, en attendant la base. */

const DATE = new Date('2026-09-27T00:00:00Z')
const published = { status: 'published', firstPublishedAt: DATE } as const
const stamps = { createdAt: DATE, updatedAt: DATE }
/** Pas encore d'accroche, de couleur ni de description dediee. */
const presentation = { tagline: null, accentColor: null, seoDescription: null }

export const MOCK_TRACKS: readonly Track[] = [
  {
    id: 1,
    slug: 'javascript',
    name: 'JavaScript',
    position: 1,
    summary: 'Le point de départ : variables, conditions, boucles, fonctions.',
    programmingLanguage: 'javascript',
    prerequisiteTrackId: null,
    ...presentation,
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
    ...presentation,
    ...published,
    ...stamps,
  },
  {
    id: 3,
    slug: 'conception',
    name: 'Conception',
    position: 3,
    summary: 'Bien nommer, bien découper : les principes qui valent quel que soit le langage.',
    // Parcours de lecons seulement : pas de langage, donc pas d'exercice.
    programmingLanguage: null,
    prerequisiteTrackId: null,
    ...presentation,
    ...published,
    ...stamps,
  },
]
