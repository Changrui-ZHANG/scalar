<script setup lang="ts">
import { ref } from 'vue'
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import type { DraftStatus, RunPending } from '~/types/exercise'

const code = defineModel<string>({ required: true })

interface Props {
  language: ProgrammingLanguage
  pending: RunPending
  draftStatus: DraftStatus
  starterChanged: boolean
  error: string | null
  actions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  actions: true,
})

const emit = defineEmits<{
  run: []
  verify: []
  reset: []
}>()

const editorRef = ref<{ insertAtCursor(text: string, cursorOffset?: number): void } | null>(null)
const resetConfirmOpen = ref(false)

function onResetClick() {
  resetConfirmOpen.value = true
}

function confirmReset() {
  resetConfirmOpen.value = false
  emit('reset')
}

defineExpose({
  insertAtCursor(text: string, cursorOffset?: number) {
    editorRef.value?.insertAtCursor(text, cursorOffset)
  },
})

const fileName = computed(() => (props.language === 'typescript' ? 'main.ts' : 'main.js'))
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-code-bg">
    <!-- Barre haute 50px -->
    <div class="flex h-[50px] shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div class="flex items-center gap-3">
        <span class="font-mono text-xs font-semibold text-text">
          {{ fileName }}
        </span>

        <!-- Statut du brouillon -->
        <span
          v-if="draftStatus === 'saved'"
          class="text-xs text-text-muted"
        >
          Brouillon enregistré
        </span>
        <span
          v-else-if="draftStatus === 'failed'"
          class="text-xs text-danger"
        >
          Brouillon non enregistré : le stockage du navigateur est indisponible.
        </span>
      </div>

      <!-- Actions desktop -->
      <div v-if="actions" class="flex items-center gap-2">
        <button
          type="button"
          aria-label="Réinitialiser au code de départ"
          title="Réinitialiser au code de départ"
          class="inline-flex size-9 items-center justify-center rounded-[10px] text-text-muted hover:bg-surface-muted hover:text-text cursor-pointer transition-colors"
          @click="onResetClick"
        >
          <Icon name="lucide:rotate-ccw" class="size-4" />
        </button>

        <UiButton
          variant="secondary"
          dense
          icon="lucide:play"
          :disabled="pending !== null"
          :loading="pending === 'run'"
          loading-label="Exécution…"
          @click="emit('run')"
        >
          Exécuter
        </UiButton>

        <UiButton
          variant="primary"
          dense
          icon="lucide:check-check"
          :disabled="pending !== null"
          :loading="pending === 'verify'"
          loading-label="Vérification…"
          @click="emit('verify')"
        >
          Vérifier
        </UiButton>
      </div>
    </div>

    <!-- Encart si starterChanged -->
    <div
      v-if="starterChanged"
      class="flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-2 text-xs text-text"
    >
      <span>Le code de départ de cet exercice a changé.</span>
      <button
        type="button"
        class="font-semibold text-primary underline cursor-pointer"
        @click="confirmReset"
      >
        Réinitialiser
      </button>
    </div>

    <!-- Conteneur CodeMirror -->
    <div class="flex-1 overflow-hidden relative">
      <UiCodeEditor
        ref="editorRef"
        v-model="code"
        :language="language"
        @run="emit('run')"
      />
    </div>

    <!-- Erreur d'exécution role="alert" -->
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

    <!-- Dialogue de confirmation de réinitialisation -->
    <UiDialog
      v-model:open="resetConfirmOpen"
      title="Réinitialiser le code"
    >
      <div class="p-6 flex flex-col gap-4">
        <h3 class="font-display text-lg font-bold text-text">
          Revenir au code de départ ?
        </h3>
        <p class="text-sm text-text-muted">
          Votre brouillon sera perdu et remplacé par le code initial de l'exercice.
        </p>
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <UiButton
            variant="secondary"
            dense
            @click="resetConfirmOpen = false"
          >
            Annuler
          </UiButton>
          <UiButton
            variant="primary"
            dense
            @click="confirmReset"
          >
            Réinitialiser
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
