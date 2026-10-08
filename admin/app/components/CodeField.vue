<script setup lang="ts">
/**
 * Editeur CodeMirror 6 pour le code et le Markdown. Tab indente ; pour sortir
 * de l'editeur au clavier : Echap puis Tab (comportement standard de CodeMirror).
 */
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { Codemirror } from 'vue-codemirror'

export type CodeLanguage = 'javascript' | 'typescript' | 'markdown'

const code = defineModel<string>({ required: true })

const props = defineProps<{
  language: CodeLanguage
  /** Nom accessible de la zone d'edition : le `label` du champ ne s'y rattache pas. */
  label: string
  placeholder?: string
  minHeight?: string
}>()

const LANGUAGES = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  markdown: () => markdown(),
} as const

// Couleurs de Nuxt UI : l'editeur suit le theme clair ou sombre de l'admin.
const theme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--ui-bg)',
    color: 'var(--ui-text)',
    border: '1px solid var(--ui-border-accented)',
    borderRadius: 'calc(var(--ui-radius) * 1.5)',
    fontSize: '0.875rem',
  },
  '&.cm-focused': { outline: '2px solid var(--ui-primary)', outlineOffset: '-1px' },
  '.cm-gutters': {
    backgroundColor: 'var(--ui-bg-elevated)',
    color: 'var(--ui-text-dimmed)',
    borderRight: '1px solid var(--ui-border)',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--ui-bg-elevated)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, ui-monospace, monospace)' },
})

const extensions = computed(() => [
  basicSetup,
  theme,
  LANGUAGES[props.language](),
  // Le Markdown se lit en paragraphes : on replie les lignes, pas le code.
  ...(props.language === 'markdown' ? [EditorView.lineWrapping] : []),
  EditorView.contentAttributes.of({ 'aria-label': props.label }),
])
</script>

<template>
  <Codemirror
    v-model="code"
    :extensions="extensions"
    :placeholder="placeholder"
    :style="{ minHeight: minHeight ?? '8rem' }"
    :tab-size="2"
    indent-with-tab
  />
</template>
