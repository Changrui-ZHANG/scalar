import { describe, expect, it } from 'vitest'
import { RESERVED_CHAPTER_SLUGS, SLUG_PATTERN, slugify } from './slug.ts'

describe('slug', () => {
  it('converts basic text to lowercase dash-separated slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('Introduction aux Fonctions')).toBe('introduction-aux-fonctions')
  })

  it('strips accents correctly', () => {
    expect(slugify('Éléphant et Thé')).toBe('elephant-et-the')
    expect(slugify('à côté d’un château')).toBe('a-cote-d-un-chateau')
  })

  it('collapses multiple non-alphanumeric characters and trims dashes', () => {
    expect(slugify('---test---slug---')).toBe('test-slug')
    expect(slugify('foo & bar / baz @ 42')).toBe('foo-bar-baz-42')
  })

  it('truncates to MAX_SLUG_LENGTH (80) and strips boundary dashes', () => {
    const longText = 'a'.repeat(100)
    const result = slugify(longText)
    expect(result.length).toBe(80)
    expect(result).toBe('a'.repeat(80))

    const longWithDashes = 'abc-'.repeat(25) // 100 chars
    const slug = slugify(longWithDashes)
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('returns empty string if nothing usable remains', () => {
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
    expect(slugify('???!!!')).toBe('')
    expect(slugify('----')).toBe('')
  })

  it('matches SLUG_PATTERN when valid', () => {
    expect(SLUG_PATTERN.test('hello-world-42')).toBe(true)
    expect(SLUG_PATTERN.test('javascript')).toBe(true)
    expect(SLUG_PATTERN.test('-hello')).toBe(false)
    expect(SLUG_PATTERN.test('hello-')).toBe(false)
    expect(SLUG_PATTERN.test('hello--world')).toBe(false)
    expect(SLUG_PATTERN.test('')).toBe(false)
  })

  it('defines RESERVED_CHAPTER_SLUGS', () => {
    expect(RESERVED_CHAPTER_SLUGS).toContain('lecon')
  })
})
