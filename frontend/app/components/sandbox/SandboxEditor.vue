<script setup lang="ts">
// Éditeur du bac à sable (specs-site.md § 8) : nom du fichier, bouton Exécuter (Ctrl ↵),
// éditeur, et l'erreur éventuelle.
import type { ProgrammingLanguage } from '@scalar/shared/enums'

const code = defineModel<string>('code', { required: true })

interface Props {
  language: ProgrammingLanguage
  pending: boolean
  error: string | null
}

const { language, pending, error } = defineProps<Props>()

const emit = defineEmits<{
  run: []
}>()

const fileName = computed(() => (language === 'typescript' ? 'main.ts' : 'main.js'))
</script>

<template>
  <div
    class="rounded-card border-border bg-code-bg flex h-75 min-w-0 flex-1 flex-col overflow-hidden border md:h-auto md:min-h-110"
  >
    <div
      class="border-border flex h-12.5 shrink-0 items-center justify-between border-b pr-2.5 pl-4"
    >
      <span class="text-meta text-code-comment font-mono">{{ fileName }}</span>
      <UiButton
        dense
        icon="lucide:play"
        class="max-md:hidden"
        :disabled="pending"
        :loading="pending"
        loading-label="Exécution…"
        @click="emit('run')"
      >
        Exécuter
        <span class="text-xs font-normal opacity-75">Ctrl ↵</span>
      </UiButton>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <UiCodeEditor
        v-model="code"
        :language="language"
        placeholder="// Écrivez votre code ici"
        aria-label="Code du bac à sable"
        @run="emit('run')"
      />
    </div>

    <p
      v-if="error"
      role="alert"
      class="border-danger bg-danger-soft text-danger flex items-center gap-2 border-t px-4 py-2.5 text-sm"
    >
      <Icon name="lucide:circle-x" class="size-4 shrink-0" />
      {{ error }}
    </p>
  </div>
</template>
