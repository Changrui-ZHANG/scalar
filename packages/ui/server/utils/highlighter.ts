import { createCssVariablesTheme, createHighlighter, type Highlighter } from 'shiki'
import { normalizeCode } from '@scalar/shared/markdown'
import type { HighlightRequestBlock, HighlightResponse, HighlightedLine } from '../../types/highlight'

let highlighterPromise: Promise<Highlighter> | null = null

const cssVariablesTheme = createCssVariablesTheme({
  name: 'css-variables',
  variablePrefix: '--shiki-',
})

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [cssVariablesTheme],
      langs: ['javascript', 'typescript'],
    })
  }
  return highlighterPromise
}

export async function highlightBlocks(
  blocks: readonly HighlightRequestBlock[]
): Promise<HighlightResponse> {
  const highlighter = await getHighlighter()

  const highlightedBlocks = blocks.map((block) => {
    const code = normalizeCode(block.code)
    const lang = block.language?.toLowerCase().trim()

    const supportedLang =
      lang === 'javascript' || lang === 'js'
        ? 'javascript'
        : lang === 'typescript' || lang === 'ts'
          ? 'typescript'
          : null

    if (!supportedLang) {
      if (code === '') {
        return { lines: [[]] }
      }
      const lines: HighlightedLine[] = code.split('\n').map((lineText) =>
        lineText.length === 0 ? [] : [{ text: lineText, color: 'var(--shiki-foreground)' }]
      )
      return { lines }
    }

    if (code === '') {
      return { lines: [[]] }
    }

    const tokenResult = highlighter.codeToTokens(code, {
      lang: supportedLang,
      theme: 'css-variables',
    })

    const lines: HighlightedLine[] = tokenResult.tokens.map((lineTokens) =>
      lineTokens.map((token) => ({
        text: token.content,
        color: token.color ?? 'var(--shiki-foreground)',
      }))
    )

    return { lines }
  })

  return { blocks: highlightedBlocks }
}
