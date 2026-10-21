<script setup lang="ts">
import type { ProgrammingLanguage } from '@scalar/shared/enums'

const code = defineModel<string>('code', { required: true })
const language = defineModel<ProgrammingLanguage>('language', { required: true })

interface Props {
  pending: boolean
  error: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  run: []
}>()

const fileName = computed(() => (language.value === 'typescript' ? 'main.ts' : 'main.js'))
</script>

<template>
  <div class="flex flex-col rounded-[14px] border border-border bg-code-bg overflow-hidden">
    <!-- Barre haute : sélecteur de langage + nom de fichier + bouton exécuter -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
      <div class="flex items-center gap-4">
        <!-- Contrôle segmenté JS / TS -->
        <div class="flex rounded-[8px] bg-surface-muted p-0.5 border border-border text-xs font-semibold">
          <button
            type="button"
            class="rounded-[6px] px-2.5 py-1 transition-colors cursor-pointer"
            :class="[
              language === 'javascript'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-text-muted hover:text-text',
            ]"
            @click="language = 'javascript'"
          >
            JavaScript
          </button>
          <button
            type="button"
            class="rounded-[6px] px-2.5 py-1 transition-colors cursor-pointer"
            :class="[
              language === 'typescript'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-text-muted hover:text-text',
            ]"
            @click="language = 'typescript'"
          >
            TypeScript
          </button>
        </div>

        <span class="font-mono text-xs text-text-muted hidden sm:inline">
          {{ fileName }}
        </span>
      </div>

      <UiButton
        variant="primary"
        dense
        icon="lucide:play"
        :disabled="pending"
        :loading="pending"
        loading-label="Exécution…"
        @click="emit('run')"
      >
        <span>Exécuter</span>
        <kbd class="hidden sm:inline font-mono text-[10px] opacity-75">Ctrl ↵</kbd>
      </UiButton>
    </div>

    <!-- Zone éditeur CodeMirror (hauteur minimale 300px sur mobile, 440px sur desktop) -->
    <div class="h-[300px] md:h-[440px] relative">
      <UiCodeEditor
        v-model="code"
        :language="language"
        @run="emit('run')"
      />
    </div>

    <!-- Erreur role="alert" -->
    <div
      v-if="error"
      role="alert"
      class="m-3 rounded-[10px] border border-danger bg-danger-soft p-3 text-xs text-danger"
    >
      <div class="flex items-center gap-2">
        <Icon name="lucide:alert-circle" class="size-4 shrink-0" />
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>
