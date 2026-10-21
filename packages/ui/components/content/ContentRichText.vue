<script setup lang="ts">
import { computed } from 'vue'
import { parseMarkdown } from '@scalar/shared/markdown'
import type { MarkdownBlock } from '@scalar/shared/markdown'
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import ContentCodeBlock from './ContentCodeBlock.vue'
import { useHighlight } from '../../composables/useHighlight'

interface Props {
  source: string
  language: ProgrammingLanguage | null
  tryable?: boolean
  variant?: 'page' | 'compact'
}

const props = withDefaults(defineProps<Props>(), {
  tryable: false,
  variant: 'page',
})

const emit = defineEmits<{
  try: [code: string, language: ProgrammingLanguage]
}>()

const blocks = computed<readonly MarkdownBlock[]>(() =>
  parseMarkdown(props.source, props.language)
)

const codeBlocks = computed(() =>
  blocks.value
    .filter((b): b is Extract<MarkdownBlock, { type: 'code' }> => b.type === 'code')
    .map((b) => ({ code: b.code, language: b.language }))
)

const highlightState = useHighlight(codeBlocks)

function getCodeBlockIndex(codeBlock: Extract<MarkdownBlock, { type: 'code' }>): number {
  let idx = 0
  for (const b of blocks.value) {
    if (b === codeBlock) return idx
    if (b.type === 'code') idx++
  }
  return -1
}

function onTry(block: Extract<MarkdownBlock, { type: 'code' }>) {
  if (block.language) {
    emit('try', block.code, block.language)
  }
}
</script>

<template>
  <div
    class="content-prose"
    :class="{ 'content-prose-compact': variant === 'compact' }"
  >
    <template v-for="(block, index) in blocks" :key="index">
      <!-- Intertitre ## -->
      <h2 v-if="block.type === 'heading'" :id="block.id">
        {{ block.text }}
      </h2>

      <!-- Paragraphe -->
      <p v-else-if="block.type === 'paragraph'">
        <template v-for="(part, partIdx) in block.parts" :key="partIdx">
          <code v-if="part.type === 'code'">{{ part.text }}</code>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>

      <!-- Liste - -->
      <ul v-else-if="block.type === 'list'">
        <li v-for="(item, itemIdx) in block.items" :key="itemIdx">
          <template v-for="(part, partIdx) in item" :key="partIdx">
            <code v-if="part.type === 'code'">{{ part.text }}</code>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ul>

      <!-- Bloc de code ``` -->
      <ContentCodeBlock
        v-else-if="block.type === 'code'"
        :code="block.code"
        :language="block.language"
        :lines="highlightState.lines.value[getCodeBlockIndex(block)] ?? null"
        :tryable="tryable"
        @try="onTry(block)"
      />
    </template>
  </div>
</template>
