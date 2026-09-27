<script setup lang="ts">
/**
 * Rendu minimal du Markdown des enonces : blocs ```code```, paragraphes et
 * `code` en ligne. Tout passe par l'interpolation Vue, jamais par `v-html`.
 */
// ponytail: sous-ensemble volontaire du Markdown ; une bibliotheque (markdown-it
// + DOMPurify) le jour ou les enonces ont besoin de listes, liens ou titres.

type Inline = { readonly code: boolean; readonly text: string }
type Block =
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'paragraph'; readonly parts: readonly Inline[] }

const props = defineProps<{ source: string }>()

function inline(text: string): Inline[] {
  // Les segments impairs sont ceux compris entre deux accents graves.
  return text.split('`').map((part, i) => ({ code: i % 2 === 1, text: part }))
}

const blocks = computed<Block[]>(() =>
  props.source.split(/```[a-z]*\n?/).flatMap((chunk, i): Block[] =>
    i % 2 === 1
      ? [{ kind: 'code', text: chunk.replace(/\n$/, '') }]
      : chunk
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter((p) => p !== '')
          .map((p) => ({ kind: 'paragraph', parts: inline(p) })),
  ),
)
</script>

<template>
  <div class="grid gap-3">
    <template v-for="(block, i) in blocks" :key="i">
      <pre
        v-if="block.kind === 'code'"
        class="overflow-x-auto rounded-md border p-3 font-mono text-sm"
      >{{ block.text }}</pre>
      <p v-else class="max-w-prose whitespace-pre-line">
        <template v-for="(part, j) in block.parts" :key="j">
          <code v-if="part.code" class="rounded border px-1 font-mono text-[0.9em]">{{
            part.text
          }}</code>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </template>
  </div>
</template>
