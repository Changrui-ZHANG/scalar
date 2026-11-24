import { describe, expect, it } from 'vitest'
import { firstSentence, pageTitle } from '../../../../../frontend/app/utils/seo'

describe('pageTitle', () => {
  it('va du plus précis au plus général, puis « — Scalar »', () => {
    expect(pageTitle(['Échanger deux valeurs', 'Variables', 'JavaScript'])).toBe(
      'Échanger deux valeurs · Variables · JavaScript — Scalar',
    )
  })

  it('donne « Scalar » seul sans partie', () => {
    expect(pageTitle([])).toBe('Scalar')
  })
})

describe('firstSentence', () => {
  it('retire le Markdown et garde la première phrase', () => {
    expect(firstSentence('Écris une fonction `swap(a, b)`. Elle renvoie un tableau.')).toBe(
      'Écris une fonction swap(a, b).',
    )
  })

  it('coupe au mot une phrase trop longue', () => {
    const long = 'mot '.repeat(60).trim()
    const result = firstSentence(long, 20)
    expect(result.length).toBeLessThanOrEqual(20)
    expect(result.endsWith('…')).toBe(true)
    expect(result).toBe('mot mot mot mot mot…')
  })
})
