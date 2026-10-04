import type { Language } from '../db/schema.ts'
import { MOCK_LANGUAGES } from './language.mock.ts'

/** Acces aux langages proposes. Seuls les langages publies sont servis. */
export interface LanguageRepository {
  /** Langages publies, tries par position. */
  listLanguages(): Promise<readonly Language[]>
  findLanguageBySlug(slug: string): Promise<Language | null>
  findLanguageById(id: number): Promise<Language | null>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

export class InMemoryLanguageRepository implements LanguageRepository {
  private readonly languages: readonly Language[]

  constructor(languages: readonly Language[] = MOCK_LANGUAGES) {
    this.languages = languages.filter((l) => l.status === 'published')
  }

  async listLanguages(): Promise<readonly Language[]> {
    return this.languages.toSorted(byPosition)
  }

  async findLanguageBySlug(slug: string): Promise<Language | null> {
    return this.languages.find((l) => l.slug === slug) ?? null
  }

  async findLanguageById(id: number): Promise<Language | null> {
    return this.languages.find((l) => l.id === id) ?? null
  }
}
