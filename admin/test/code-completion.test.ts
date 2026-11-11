import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { codeLanguageExtension } from '../app/utils/code-editor'

async function completionsAtEnd(language: 'javascript' | 'typescript', doc: string) {
  const state = EditorState.create({ doc, extensions: [codeLanguageExtension(language)] })
  ensureSyntaxTree(state, doc.length, 5000)
  const context = new CompletionContext(state, doc.length, true)
  const labels: string[] = []
  for (const source of state.languageDataAt<CompletionSource>('autocomplete', doc.length)) {
    const result = await source(context)
    if (result) labels.push(...result.options.map((option) => option.label))
  }
  return labels
}

describe('autocomplétion des éditeurs de code', () => {
  it.each(['javascript', 'typescript'] as const)(
    '%s : propriétés des objets standard',
    async (language) => {
      expect(await completionsAtEnd(language, 'Math.ma')).toContain('max')
      expect(await completionsAtEnd(language, 'console.lo')).toContain('log')
    },
  )

  it.each(['javascript', 'typescript'] as const)(
    '%s : objets standard au premier niveau',
    async (language) => {
      expect(await completionsAtEnd(language, 'const x = Ma')).toContain('Math')
    },
  )

  it('ne propose pas les globales du navigateur : le code tourne sous Node', async () => {
    expect(await completionsAtEnd('javascript', 'const x = docu')).not.toContain('document')
  })

  it('typescript : mots-clés propres à TypeScript', async () => {
    expect(await completionsAtEnd('typescript', 'inter')).toContain('interface')
  })
})
