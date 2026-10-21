<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeCode } from '@scalar/shared/markdown'
import { PROGRAMMING_LANGUAGE_LABELS } from '@scalar/shared/labels'
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import type { HighlightedLine } from '../../types/highlight'

interface Props {
  code: string
  language: ProgrammingLanguage | null
  lines: readonly HighlightedLine[] | null
  tryable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tryable: false,
})

const emit = defineEmits<{
  try: []
}>()

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function onCopy() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // Échec de copie silencieux
  }
}

// Sans jetons : chaque ligne en un seul morceau, couleur du texte.
// normalizeCode : la même normalisation que la route (\r\n, fin de ligne finale).
const rows = computed(() => {
  if (props.lines) {
    return props.lines
  }
  const normalized = normalizeCode(props.code)
  if (normalized === '') {
    return [[]]
  }
  return normalized
    .split('\n')
    .map((text) => (text.length === 0 ? [] : [{ text, color: 'var(--shiki-foreground)' }]))
})

const languageLabel = computed(() => {
  if (!props.language) return null
  return PROGRAMMING_LANGUAGE_LABELS[props.language] ?? props.language
})
</script>

<template>
  <div
    class="border-(--scalar-ui-code-border) bg-(--scalar-ui-code-bg) my-4 overflow-hidden rounded-[14px] border"
  >
    <!-- Barre haute -->
    <div
      class="border-(--scalar-ui-code-border) flex min-h-9 items-center justify-between border-b px-4 py-1.5"
    >
      <span class="text-(--scalar-ui-code-comment) text-[12.5px] font-medium">
        {{ languageLabel ?? '' }}
      </span>

      <div class="flex items-center gap-3">
        <!-- Essayer dans le bac à sable (masqué si le bloc n'a pas de langage) -->
        <button
          v-if="tryable && language"
          type="button"
          class="text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold transition-colors"
          @click="emit('try')"
        >
          <Icon name="lucide:play" class="size-3.5 shrink-0" aria-hidden="true" />
          <span>Essayer dans le bac à sable</span>
        </button>

        <!-- Copier -->
        <button
          type="button"
          class="text-(--scalar-ui-code-comment) hover:text-(--scalar-ui-code-text) inline-flex cursor-pointer items-center gap-1 text-[12.5px] transition-colors"
          :aria-label="copied ? 'Code copié' : 'Copier le code'"
          @click="onCopy"
        >
          <Icon
            :name="copied ? 'lucide:check' : 'lucide:copy'"
            class="size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>{{ copied ? 'Copié !' : 'Copier' }}</span>
        </button>
      </div>
    </div>

    <!-- Corps de code -->
    <pre
      class="overflow-x-auto p-4 font-mono text-[13.5px] leading-relaxed"
    ><code><span v-for="(line, i) in rows" :key="i" class="flex"><span class="text-(--scalar-ui-code-line) mr-4 w-6 shrink-0 select-none text-right tabular-nums">{{ i + 1 }}</span><span class="min-w-0 flex-1 whitespace-pre"><template v-if="line.length > 0"><span v-for="(token, j) in line" :key="j" :style="{ color: token.color }">{{ token.text }}</span></template><template v-else>&#8203;</template></span></span></code></pre>
  </div>
</template>
