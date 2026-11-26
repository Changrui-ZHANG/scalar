<script setup lang="ts">
// Rangée de touches au-dessus du clavier, onglet Code sur mobile (specs-site.md § 7.4).
// Une paire place le curseur entre ses deux signes ; Tab insère deux espaces.
const emit = defineEmits<{
  insert: [text: string, cursorOffset: number]
}>()

// text : ce qui est inséré ; cursorOffset : où placer le curseur après l'insertion.
const keys = [
  { label: '{ }', text: '{}', cursorOffset: 1 },
  { label: '( )', text: '()', cursorOffset: 1 },
  { label: '[ ]', text: '[]', cursorOffset: 1 },
  { label: '=>', text: '=> ', cursorOffset: 3 },
  { label: '"', text: '""', cursorOffset: 1 },
  { label: 'Tab', text: '  ', cursorOffset: 2 },
]
</script>

<template>
  <div class="border-border bg-surface flex shrink-0 gap-1.5 border-t px-2.5 py-2 md:hidden">
    <button
      v-for="key in keys"
      :key="key.label"
      type="button"
      class="bg-surface-muted text-meta text-text flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg font-mono"
      @click="emit('insert', key.text, key.cursorOffset)"
    >
      {{ key.label }}
    </button>
  </div>
</template>
