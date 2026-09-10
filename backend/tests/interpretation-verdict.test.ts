import { describe, expect, it } from 'vitest'
import {
  FAMILLES_INTERPRETATION,
  familleInterpretation,
  phraseInterpretation,
} from '../src/services/interpretation-verdict.ts'

// Table pure, sans base de donnees (AD-24 : jamais un LLM) : ces cas
// s'executent donc toujours, meme sans `MONGODB_URI_TEST`.
describe('familleInterpretation', () => {
  it('rend timeout pour un verdict timeout', () => {
    expect(familleInterpretation({ verdict: 'timeout', aDemarreLesTests: false })).toBe('timeout')
  })

  it('rend plateforme pour un verdict error d origine plateforme', () => {
    expect(
      familleInterpretation({ verdict: 'error', failureOrigin: 'plateforme', aDemarreLesTests: false }),
    ).toBe('plateforme')
  })

  it('rend typage pour un verdict error dont les tests n ont jamais demarre', () => {
    expect(
      familleInterpretation({ verdict: 'error', failureOrigin: 'apprenant', aDemarreLesTests: false }),
    ).toBe('typage')
  })

  it('rend execution pour un verdict error dont les tests ont demarre', () => {
    expect(
      familleInterpretation({ verdict: 'error', failureOrigin: 'apprenant', aDemarreLesTests: true }),
    ).toBe('execution')
  })

  it('ne rend aucune famille pour passed ou failed', () => {
    expect(familleInterpretation({ verdict: 'passed', aDemarreLesTests: true })).toBeUndefined()
    expect(familleInterpretation({ verdict: 'failed', aDemarreLesTests: true })).toBeUndefined()
  })
})

describe('phraseInterpretation', () => {
  it('rend une phrase non vide et distincte pour chaque famille', () => {
    const phrases = FAMILLES_INTERPRETATION.map((famille) => phraseInterpretation(famille))

    for (const phrase of phrases) {
      expect(phrase.length).toBeGreaterThan(0)
    }

    expect(new Set(phrases).size).toBe(FAMILLES_INTERPRETATION.length)
  })
})
