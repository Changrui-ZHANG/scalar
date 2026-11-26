import { describe, expect, it } from 'vitest'
import { highlightBlocks } from './highlighter'

describe('highlighter', () => {
  it('colore un bloc JavaScript en jetons Shiki avec variables CSS', async () => {
    const res = await highlightBlocks([
      {
        code: 'const x = 42',
        language: 'javascript',
      },
    ])

    expect(res.blocks).toHaveLength(1)
    const lines = res.blocks[0]!.lines
    expect(lines.length).toBeGreaterThan(0)

    // Vérifie que chaque jeton utilise une variable CSS var(--shiki-...)
    const firstLine = lines[0]!
    expect(firstLine.length).toBeGreaterThan(0)
    for (const token of firstLine) {
      expect(token.color).toMatch(/^var\(--shiki-/)
    }

    // Le texte reconstitué redonne la ligne d'origine
    const reconstructed = firstLine.map((t) => t.text).join('')
    expect(reconstructed).toBe('const x = 42')
  })

  it('colore un bloc TypeScript', async () => {
    const res = await highlightBlocks([
      {
        code: 'type Str = string',
        language: 'typescript',
      },
    ])

    expect(res.blocks).toHaveLength(1)
    const lines = res.blocks[0]!.lines
    const text = lines[0]!.map((t) => t.text).join('')
    expect(text).toBe('type Str = string')
  })

  it('fournit une seule couleur pour un langage non supporté ou nul', async () => {
    const res = await highlightBlocks([
      {
        code: 'plain text',
        language: null,
      },
    ])

    expect(res.blocks).toHaveLength(1)
    const lines = res.blocks[0]!.lines
    expect(lines).toEqual([[{ text: 'plain text', color: 'var(--shiki-foreground)' }]])
  })

  it('gère un bloc vide avec une ligne vide [[]]', async () => {
    const res = await highlightBlocks([
      {
        code: '',
        language: 'javascript',
      },
    ])

    expect(res.blocks).toHaveLength(1)
    expect(res.blocks[0]!.lines).toEqual([[]])
  })
})
