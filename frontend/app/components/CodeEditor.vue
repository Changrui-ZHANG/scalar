<script setup lang="ts">
/**
 * Zone de saisie du code. Une simple zone de texte : Tab garde son role de
 * navigation au clavier, et le code defile horizontalement sans deborder.
 */
// Textarea ; un editeur (CodeMirror) le jour ou la coloration ou
// l'autocompletion deviennent un besoin.
const code = defineModel<string>({ required: true })

defineProps<{
  id: string
  label: string
  filename?: string
  placeholder?: string
  rows?: number
}>()
</script>

<template>
  <div
    class="bg-code-surface text-code-foreground focus-within:outline-brand overflow-hidden rounded-xl focus-within:outline-2 focus-within:outline-offset-2"
  >
    <div
      class="text-body-sm flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2"
    >
      <label :for="id" class="font-semibold">{{ label }}</label>
      <span v-if="filename" class="font-mono opacity-70">{{ filename }}</span>
    </div>
    <textarea
      :id="id"
      v-model="code"
      :rows="rows ?? 14"
      :placeholder="placeholder"
      wrap="off"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      class="block w-full resize-y overflow-x-auto bg-transparent p-4 font-mono text-sm leading-6 whitespace-pre placeholder:text-white/40 focus-visible:outline-none"
    />
  </div>
</template>
