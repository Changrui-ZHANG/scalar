import { describe, expect, it } from 'vitest'

import { formatCell, truncate } from '../app/utils/format'

describe('formatCell', () => {
  it('signale les valeurs nulles', () => {
    expect(formatCell(null)).toBe('∅')
  })

  it('serialise tableaux et objets JSON', () => {
    expect(formatCell([1, 'a'])).toBe('[1,"a"]')
    expect(formatCell({ ok: true })).toBe('{"ok":true}')
  })

  it('garde chaines, nombres et booleens', () => {
    expect(formatCell('texte')).toBe('texte')
    expect(formatCell(42)).toBe('42')
    expect(formatCell(false)).toBe('false')
  })
})

describe('truncate', () => {
  it('laisse un texte court intact', () => {
    expect(truncate('court', 10)).toBe('court')
  })

  it('coupe un texte long avec une ellipse', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
  })
})
