import { describe, expect, it } from 'vitest'
import {
  countWords,
  normalizeCode,
  parseMarkdown,
  readingTime,
  stripMarkdown,
} from './markdown.ts'

describe('markdown.ts', () => {
  describe('normalizeCode', () => {
    it('normalise les sauts de ligne Windows CRLF et supprime le saut final', () => {
      expect(normalizeCode('const a = 1;\r\nconst b = 2;\r\n')).toBe('const a = 1;\nconst b = 2;')
    })
  })

  describe('parseMarkdown', () => {
    it('extrait les intertitres ## avec id slugifié', () => {
      const md = `## Introduction\n\nDu texte.\n\n## Les variables et types\n\nSuite.`
      const blocks = parseMarkdown(md)

      expect(blocks).toHaveLength(4)
      expect(blocks[0]).toEqual({
        type: 'heading',
        text: 'Introduction',
        id: 'introduction',
      })
      expect(blocks[2]).toEqual({
        type: 'heading',
        text: 'Les variables et types',
        id: 'les-variables-et-types',
      })
    })

    it('gère les doublons d’intertitres en ajoutant un suffixe numérique', () => {
      const md = `## Exemple\n\nPremier.\n\n## Exemple\n\nDeuxième.\n\n## Exemple\n\nTroisième.`
      const blocks = parseMarkdown(md)

      const headings = blocks.filter((b) => b.type === 'heading')
      expect(headings).toHaveLength(3)
      expect(headings[0]?.id).toBe('exemple')
      expect(headings[1]?.id).toBe('exemple-2')
      expect(headings[2]?.id).toBe('exemple-3')
    })

    it('gère les titres non slugifiables avec le repli section-n', () => {
      const md = `## ???\n\nTexte.`
      const blocks = parseMarkdown(md)

      const heading = blocks.find((b) => b.type === 'heading')
      expect(heading?.id).toBe('section-1')
    })

    it('détecte le langage des blocs de code et applique le repli trackLanguage', () => {
      const md = '```js\nconst x = 1\n```\n\n```ts\nconst y: number = 2\n```\n\n```\nlet z = 3\n```'
      const blocks = parseMarkdown(md, 'javascript')

      expect(blocks).toHaveLength(3)
      expect(blocks[0]).toEqual({
        type: 'code',
        code: 'const x = 1',
        language: 'javascript',
      })
      expect(blocks[1]).toEqual({
        type: 'code',
        code: 'const y: number = 2',
        language: 'typescript',
      })
      expect(blocks[2]).toEqual({
        type: 'code',
        code: 'let z = 3',
        language: 'javascript',
      })
    })

    it('découpe les paragraphes avec code en ligne', () => {
      const md = 'Voici `const x = 10` et un peu de texte.'
      const blocks = parseMarkdown(md)

      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toEqual({
        type: 'paragraph',
        parts: [
          { type: 'text', text: 'Voici ' },
          { type: 'code', text: 'const x = 10' },
          { type: 'text', text: ' et un peu de texte.' },
        ],
      })
    })

    it('analyse les listes à puces', () => {
      const md = '- Premier item\n- Deuxième item avec `code`'
      const blocks = parseMarkdown(md)

      expect(blocks).toHaveLength(1)
      expect(blocks[0]?.type).toBe('list')
      if (blocks[0]?.type === 'list') {
        expect(blocks[0].items).toHaveLength(2)
        expect(blocks[0].items[0]).toEqual([{ type: 'text', text: 'Premier item' }])
        expect(blocks[0].items[1]).toEqual([
          { type: 'text', text: 'Deuxième item avec ' },
          { type: 'code', text: 'code' },
        ])
      }
    })
  })

  describe('stripMarkdown, countWords et readingTime', () => {
    it('retire les blocs de code et fusionne en une ligne', () => {
      const md = `## Titre\n\nParagraphe avec \`code\`.\n\n\`\`\`js\nconst ignored = true;\n\`\`\`\n\n- Puce 1\n- Puce 2`
      const stripped = stripMarkdown(md)
      expect(stripped).toBe('Titre Paragraphe avec code. Puce 1 Puce 2')
    })

    it('compte les mots hors code et calcule le temps de lecture', () => {
      const md = `## Titre\n\nUn deux trois quatre cinq.\n\n\`\`\`js\ncent mots de code ignores...\n\`\`\``
      expect(countWords(md)).toBe(6) // Titre + 5 mots
      expect(readingTime(md)).toBe(1) // ceil(6 / 200) = 1
    })
  })
})
