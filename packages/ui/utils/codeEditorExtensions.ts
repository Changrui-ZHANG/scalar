import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion, closeBrackets, snippetCompletion } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'
import type { ProgrammingLanguage } from '@scalar/shared/enums'

export interface CodeEditorOptions {
  readonly language: ProgrammingLanguage | null
  readonly autocomplete: boolean
}

// Thème syntaxique reliant les jetons Lezer aux variables CSS Scalar
export const codeEditorHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--scalar-ui-code-keyword)' },
  { tag: tags.operator, color: 'var(--scalar-ui-code-keyword)' },
  { tag: tags.function(tags.variableName), color: 'var(--scalar-ui-code-function)' },
  { tag: tags.definition(tags.function(tags.variableName)), color: 'var(--scalar-ui-code-function)' },
  { tag: tags.string, color: 'var(--scalar-ui-code-string)' },
  { tag: tags.comment, color: 'var(--scalar-ui-code-comment)', fontStyle: 'italic' },
  { tag: tags.number, color: 'var(--scalar-ui-code-keyword)' },
  { tag: tags.bool, color: 'var(--scalar-ui-code-keyword)' },
  { tag: tags.null, color: 'var(--scalar-ui-code-keyword)' },
  { tag: tags.variableName, color: 'var(--scalar-ui-code-text)' },
  { tag: tags.punctuation, color: 'var(--scalar-ui-code-text)' },
])

// Thème structurel CodeMirror
export const codeEditorBaseTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--scalar-ui-code-bg)',
    color: 'var(--scalar-ui-code-text)',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    caretColor: 'var(--scalar-ui-code-text)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--scalar-ui-code-text)',
    borderLeftWidth: '2px',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--scalar-ui-code-bg)',
    color: 'var(--scalar-ui-code-line)',
    border: 'none',
    borderRight: '1px solid var(--scalar-ui-code-border)',
  },
  '.cm-gutterElement': {
    fontFamily: "'Fira Code', monospace",
    fontSize: '13px',
    paddingLeft: '8px',
    paddingRight: '12px',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--scalar-ui-code-text)',
  },
})

export const codeEditorTheme: Extension = [
  codeEditorBaseTheme,
  syntaxHighlighting(codeEditorHighlightStyle),
]

export function languageExtension(language: ProgrammingLanguage | null): Extension {
  if (language === 'typescript') {
    return javascript({ typescript: true })
  }
  if (language === 'javascript') {
    return javascript()
  }
  return []
}

const CODE_SNIPPETS = [
  snippetCompletion('function ${name}(${params}) {\n  ${}\n}', {
    label: 'function',
    detail: 'modèle de fonction',
    type: 'function',
  }),
  snippetCompletion('if (${condition}) {\n  ${}\n}', {
    label: 'if',
    detail: 'modèle conditionnel',
    type: 'keyword',
  }),
  snippetCompletion('for (let ${i} = 0; ${i} < ${length}; ${i}++) {\n  ${}\n}', {
    label: 'for',
    detail: 'modèle de boucle',
    type: 'keyword',
  }),
  snippetCompletion('for (const ${item} of ${iterable}) {\n  ${}\n}', {
    label: 'for...of',
    detail: 'modèle de boucle for...of',
    type: 'keyword',
  }),
  snippetCompletion('const ${name} = ${value}', {
    label: 'const',
    detail: 'modèle de constante',
    type: 'keyword',
  }),
]

export function completionExtension(language: ProgrammingLanguage | null): Extension {
  if (!language) {
    return []
  }

  return [
    closeBrackets(),
    autocompletion({
      override: [
        (context) => {
          const word = context.matchBefore(/\w*/)
          if (!word || (word.from === word.to && !context.explicit)) {
            return null
          }
          return {
            from: word.from,
            options: CODE_SNIPPETS,
          }
        },
      ],
      activateOnTyping: true,
    }),
  ]
}

export function codeEditorExtensions(options: CodeEditorOptions): Extension[] {
  const extensions: Extension[] = [
    lineNumbers(),
    indentUnit.of('  '), // 2 espaces
    codeEditorTheme,
    // Sortir du focus sur Échap (aucun piège clavier)
    keymap.of([
      {
        key: 'Escape',
        run(view) {
          view.contentDOM.blur()
          return true
        },
      },
      indentWithTab,
    ]),
  ]

  const lang = languageExtension(options.language)
  if (lang) {
    extensions.push(lang)
  }

  if (options.autocomplete) {
    const comp = completionExtension(options.language)
    if (comp) {
      extensions.push(comp)
    }
  }

  return extensions
}
