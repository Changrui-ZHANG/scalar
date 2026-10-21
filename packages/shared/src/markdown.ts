import { marked, type Token } from 'marked'
import type { ProgrammingLanguage } from './enums.ts'
import { slugify } from './slug.ts'

export type InlinePart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'code'; readonly text: string }

export type MarkdownBlock =
  | { readonly type: 'heading'; readonly text: string; readonly id: string }
  | { readonly type: 'paragraph'; readonly parts: readonly InlinePart[] }
  | { readonly type: 'list'; readonly items: readonly (readonly InlinePart[])[] }
  | { readonly type: 'code'; readonly code: string; readonly language: ProgrammingLanguage | null }

export function normalizeCode(code: string): string {
  return code.replace(/\r\n/g, '\n').replace(/\n$/, '')
}

function parseInlineTokens(tokens: Token[]): readonly InlinePart[] {
  const parts: InlinePart[] = []

  const walk = (toks: Token[]) => {
    for (const token of toks) {
      if (token.type === 'codespan') {
        parts.push({ type: 'code', text: token.text })
      } else if ('tokens' in token && Array.isArray(token.tokens) && token.tokens.length > 0) {
        walk(token.tokens)
      } else {
        const raw = 'raw' in token && typeof token.raw === 'string' ? token.raw : ('text' in token && typeof token.text === 'string' ? token.text : '')
        if (raw) {
          parts.push({ type: 'text', text: raw })
        }
      }
    }
  }

  walk(tokens)

  // Fusionner les parties texte adjacentes
  const merged: InlinePart[] = []
  for (const part of parts) {
    const last = merged[merged.length - 1]
    if (part.type === 'text' && last?.type === 'text') {
      merged[merged.length - 1] = { type: 'text', text: last.text + part.text }
    } else {
      merged.push(part)
    }
  }

  return merged
}

export function parseMarkdown(
  text: string,
  trackLanguage: ProgrammingLanguage | null = null,
): readonly MarkdownBlock[] {
  const tokens = marked.lexer(text)
  const blocks: MarkdownBlock[] = []
  const seenIds = new Map<string, number>()
  let headingRank = 0

  for (const token of tokens) {
    if (token.type === 'space') {
      continue
    }

    if (token.type === 'heading' && token.depth === 2) {
      headingRank += 1
      const rawText = token.text.trim()
      let id = slugify(rawText)
      if (!id) {
        id = `section-${headingRank}`
      }

      const count = seenIds.get(id) ?? 0
      seenIds.set(id, count + 1)
      if (count > 0) {
        id = `${id}-${count + 1}`
      }

      blocks.push({
        type: 'heading',
        text: rawText,
        id,
      })
      continue
    }

    if (token.type === 'code') {
      let language: ProgrammingLanguage | null = null
      const lang = token.lang?.toLowerCase().trim()
      if (lang === 'js' || lang === 'javascript') {
        language = 'javascript'
      } else if (lang === 'ts' || lang === 'typescript') {
        language = 'typescript'
      } else if (!lang && trackLanguage) {
        language = trackLanguage
      }

      blocks.push({
        type: 'code',
        code: normalizeCode(token.text),
        language,
      })
      continue
    }

    if (token.type === 'paragraph') {
      const parts = parseInlineTokens(token.tokens ?? [])
      if (parts.length > 0) {
        blocks.push({ type: 'paragraph', parts })
      }
      continue
    }

    if (token.type === 'list') {
      const items: (readonly InlinePart[])[] = []
      for (const item of token.items) {
        const itemParts = parseInlineTokens(item.tokens ?? [])
        if (itemParts.length > 0) {
          items.push(itemParts)
        }
      }
      if (items.length > 0) {
        blocks.push({ type: 'list', items })
      }
      continue
    }

    // Tout autre jeton hors sous-ensemble devient du texte brut dans un paragraphe
    const raw = token.raw.trim()
    if (raw) {
      blocks.push({
        type: 'paragraph',
        parts: [{ type: 'text', text: raw }],
      })
    }
  }

  return blocks
}

export function stripMarkdown(text: string): string {
  const blocks = parseMarkdown(text, null)
  const textParts: string[] = []

  for (const block of blocks) {
    if (block.type === 'heading') {
      textParts.push(block.text)
    } else if (block.type === 'paragraph') {
      textParts.push(block.parts.map((p) => p.text).join(''))
    } else if (block.type === 'list') {
      for (const item of block.items) {
        textParts.push(item.map((p) => p.text).join(''))
      }
    }
    // Les blocs de code sont omis
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim()
}

export function countWords(text: string): number {
  const stripped = stripMarkdown(text)
  if (!stripped) {
    return 0
  }
  return stripped.split(/\s+/).filter(Boolean).length
}

export function readingTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200))
}
