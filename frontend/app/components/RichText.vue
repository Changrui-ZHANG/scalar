<script setup lang="ts">
/**
 * Rendu minimal du Markdown des enonces et des cours : blocs ```code```,
 * titres `## `, listes `- `, paragraphes et `code` en ligne. Tout passe par
 * l'interpolation Vue, jamais par `v-html`.
 */
// Sous-ensemble volontaire du Markdown ; une bibliotheque (markdown-it
// + DOMPurify) le jour ou les cours ont besoin de liens, d'images ou de tableaux.

type Inline = { readonly code: boolean; readonly text: string }
type Block =
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'heading'; readonly parts: readonly Inline[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly Inline[])[] }
  | { readonly kind: 'paragraph'; readonly parts: readonly Inline[] }

const props = defineProps<{ source: string }>()

function inline(text: string): Inline[] {
  // Les segments impairs sont ceux compris entre deux accents graves.
  return text.split('`').map((part, i) => ({ code: i % 2 === 1, text: part }))
}

function textBlock(text: string): Block {
  if (text.startsWith('## ')) {
    return { kind: 'heading', parts: inline(text.slice(3)) }
  }
  const lines = text.split('\n')
  if (lines.every((line) => line.startsWith('- '))) {
    return { kind: 'list', items: lines.map((line) => inline(line.slice(2))) }
  }
  return { kind: 'paragraph', parts: inline(text) }
}

const blocks = computed<Block[]>(() =>
  props.source.split(/```[a-z]*\n?/).flatMap((chunk, i): Block[] =>
    i % 2 === 1
      ? [{ kind: 'code', text: chunk.replace(/\n$/, '') }]
      : chunk
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter((p) => p !== '')
          .map(textBlock),
  ),
)
</script>

<template>
  <div class="grid gap-3">
    <template v-for="(block, i) in blocks" :key="i">
      <pre
        v-if="block.kind === 'code'"
        class="bg-code-surface text-code-foreground overflow-x-auto rounded-xl p-4 font-mono text-sm leading-6"
        >{{ block.text }}</pre>
      <h3 v-else-if="block.kind === 'heading'" class="font-display mt-3 text-xl font-semibold">
        <RichInline :parts="block.parts" />
      </h3>
      <ul v-else-if="block.kind === 'list'" class="grid max-w-prose list-disc gap-1 pl-6">
        <li v-for="(item, j) in block.items" :key="j"><RichInline :parts="item" /></li>
      </ul>
      <p v-else class="max-w-prose whitespace-pre-line">
        <RichInline :parts="block.parts" />
      </p>
    </template>
  </div>
</template>
