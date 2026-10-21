import { describe, expect, it } from 'vitest'
import {
  codeEditorExtensions,
  completionExtension,
  languageExtension,
} from './codeEditorExtensions'

describe('codeEditorExtensions', () => {
  it('génère les extensions pour TypeScript avec autocomplétion', () => {
    const extensions = codeEditorExtensions({
      language: 'typescript',
      autocomplete: true,
    })
    expect(extensions.length).toBeGreaterThan(0)
  })

  it('génère les extensions pour JavaScript sans autocomplétion', () => {
    const extensions = codeEditorExtensions({
      language: 'javascript',
      autocomplete: false,
    })
    expect(extensions.length).toBeGreaterThan(0)
  })

  it('génère les extensions sans langage (éditeur de cours texte)', () => {
    const extensions = codeEditorExtensions({
      language: null,
      autocomplete: false,
    })
    expect(extensions.length).toBeGreaterThan(0)
  })

  it('languageExtension retourne une extension non vide pour JS et TS, vide sinon', () => {
    expect(languageExtension('javascript')).toBeTruthy()
    expect(languageExtension('typescript')).toBeTruthy()
    expect(languageExtension(null)).toEqual([])
  })

  it('completionExtension retourne une extension pour JS et TS, vide pour null', () => {
    expect(completionExtension('javascript')).toBeTruthy()
    expect(completionExtension(null)).toEqual([])
  })
})
