import type { Language } from '../db/schema.ts'

/** Donnees fictives : les langages proposes, en attendant la base. */

const DATE = new Date('2026-09-27T00:00:00Z')
const stamps = { createdAt: DATE, updatedAt: DATE }

export const MOCK_LANGUAGES: readonly Language[] = [
  {
    id: 1,
    slug: 'javascript',
    label: 'JavaScript',
    position: 1,
    summary: 'Le point de départ : variables, conditions, boucles, fonctions.',
    runtime: 'node',
    prerequisiteLanguageId: null,
    status: 'published',
    ...stamps,
  },
  {
    id: 2,
    slug: 'typescript',
    label: 'TypeScript',
    position: 2,
    summary: 'JavaScript avec des types vérifiés. Suppose les bases de JavaScript.',
    runtime: 'node_strip_types',
    prerequisiteLanguageId: 1,
    status: 'published',
    ...stamps,
  },
]
