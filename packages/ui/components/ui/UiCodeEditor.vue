<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import { codeEditorExtensions } from '../../utils/codeEditorExtensions'

const model = defineModel<string>({ required: true })

interface Props {
  language: ProgrammingLanguage | null
  extensions?: readonly Extension[]
  autocomplete?: boolean
  placeholder?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  autocomplete: true,
  extensions: () => [],
  placeholder: '',
  ariaLabel: 'Éditeur de code',
})

const emit = defineEmits<{
  run: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const isMounted = ref(false)
let editorView: EditorView | null = null

// Lignes du code pour le rendu serveur <pre>
const serverLines = computed(() => {
  const text = model.value ?? ''
  return text.split('\n')
})

function initEditor() {
  if (!containerRef.value) return

  const state = EditorState.create({
    doc: model.value,
    extensions: [
      ...codeEditorExtensions({
        language: props.language,
        autocomplete: props.autocomplete,
      }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            emit('run')
            return true
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          model.value = update.state.doc.toString()
        }
      }),
      ...(props.extensions ?? []),
    ],
  })

  editorView = new EditorView({
    state,
    parent: containerRef.value,
  })

  if (props.ariaLabel) {
    editorView.contentDOM.setAttribute('aria-label', props.ariaLabel)
  }
}

watch(model, (newVal) => {
  if (editorView && newVal !== editorView.state.doc.toString()) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: newVal },
    })
  }
})

watch(
  () => props.language,
  () => {
    if (editorView) {
      editorView.destroy()
      initEditor()
    }
  }
)

onMounted(() => {
  isMounted.value = true
  nextTick(() => {
    initEditor()
  })
})

onUnmounted(() => {
  editorView?.destroy()
  editorView = null
})

function insertAtCursor(text: string, cursorOffset?: number): void {
  if (!editorView) return
  const selection = editorView.state.selection.main
  const offset = cursorOffset !== undefined ? cursorOffset : text.length
  editorView.dispatch({
    changes: { from: selection.from, to: selection.to, insert: text },
    selection: { anchor: selection.from + offset },
  })
  editorView.focus()
}

function wrapSelection(before: string, after: string): void {
  if (!editorView) return
  const selection = editorView.state.selection.main
  const selectedText = editorView.state.sliceDoc(selection.from, selection.to)
  const replacement = `${before}${selectedText}${after}`
  editorView.dispatch({
    changes: { from: selection.from, to: selection.to, insert: replacement },
    selection: {
      anchor: selection.from + before.length,
      head: selection.to + before.length,
    },
  })
  editorView.focus()
}

defineExpose({
  insertAtCursor,
  wrapSelection,
})
</script>

<template>
  <div class="border-(--scalar-ui-code-border) bg-(--scalar-ui-code-bg) relative h-full w-full overflow-hidden">
    <!-- Rendu serveur SSR : <pre> aux mêmes dimensions pour éviter tout saut de mise en page -->
    <pre
      v-if="!isMounted"
      class="bg-(--scalar-ui-code-bg) text-(--scalar-ui-code-text) h-full w-full overflow-auto p-0 font-mono text-sm leading-[1.6]"
    ><code><span v-for="(line, i) in serverLines" :key="i" class="flex"><span class="text-(--scalar-ui-code-line) border-(--scalar-ui-code-border) mr-3 w-8 select-none border-r pr-2 text-right tabular-nums">{{ i + 1 }}</span><span class="whitespace-pre">{{ line || ' ' }}</span></span></code></pre>

    <!-- Rendu client : conteneur de CodeMirror 6 -->
    <div
      v-show="isMounted"
      ref="containerRef"
      class="h-full w-full"
    />
  </div>
</template>
