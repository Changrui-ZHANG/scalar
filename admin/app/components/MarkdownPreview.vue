<script setup lang="ts">
/**
 * Apercu d'un enonce tel que le site l'affichera : memes regles que
 * `frontend/app/components/RichText.vue` (blocs ```, titres `## `, listes `- `,
 * paragraphes, `code` en ligne). Le reste du Markdown s'affiche tel quel, ce
 * qui previent l'auteur que le site ne le mettra pas en forme.
 */
// Regles copiees du frontend ; les deplacer dans un paquet commun
// (packages/shared) des qu'une troisieme copie apparait ou qu'elles changent.

type Inline = { readonly code: boolean; readonly text: string }
type Block =
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'heading'; readonly parts: readonly Inline[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly Inline[])[] }
  | { readonly kind: 'paragraph'; readonly parts: readonly Inline[] }

const props = defineProps<{ source: string }>()

const inline = (text: string): Inline[] =>
  text.split('`').map((part, i) => ({ code: i % 2 === 1, text: part }))

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
  <div class="grid content-start gap-3 text-sm">
    <p v-if="!blocks.length" class="text-dimmed">L’aperçu apparaîtra ici.</p>
    <template v-for="(block, i) in blocks" :key="i">
      <pre
        v-if="block.kind === 'code'"
        class="bg-inverted text-inverted overflow-x-auto rounded-md p-3 font-mono leading-6"
        >{{ block.text }}</pre>
      <h3 v-else-if="block.kind === 'heading'" class="mt-2 text-base font-semibold">
        <template v-for="(part, j) in block.parts" :key="j">
          <code v-if="part.code" class="bg-elevated rounded px-1">{{ part.text }}</code>
          <template v-else>{{ part.text }}</template>
        </template>
      </h3>
      <ul v-else-if="block.kind === 'list'" class="grid list-disc gap-1 pl-5">
        <li v-for="(item, j) in block.items" :key="j">
          <template v-for="(part, k) in item" :key="k">
            <code v-if="part.code" class="bg-elevated rounded px-1">{{ part.text }}</code>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ul>
      <p v-else class="whitespace-pre-line">
        <template v-for="(part, j) in block.parts" :key="j">
          <code v-if="part.code" class="bg-elevated rounded px-1">{{ part.text }}</code>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </template>
  </div>
</template>
