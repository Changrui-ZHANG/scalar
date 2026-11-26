<script setup lang="ts">
// Panneau de code de l'exercice (specs-site.md § 3.6, § 7.1) : barre haute (fichier,
// brouillon, Réinitialiser, Exécuter, Vérifier), éditeur, erreur. Une seule instance,
// pour desktop et mobile : sur mobile, Exécuter et Vérifier sont dans la barre basse.
import type { ProgrammingLanguage } from '@scalar/shared/enums'
import type { DraftStatus, RunPending } from '~/types/exercise'

const code = defineModel<string>({ required: true })

interface Props {
  language: ProgrammingLanguage
  pending: RunPending
  draftStatus: DraftStatus
  starterChanged: boolean // encart « Le code de départ de cet exercice a changé. »
  error: string | null
}

const { language, pending, draftStatus, starterChanged, error } = defineProps<Props>()

const emit = defineEmits<{
  run: []
  verify: []
  reset: []
}>()

const editor = ref<{ insertAtCursor(text: string, cursorOffset?: number): void } | null>(null)
const confirmOpen = ref(false)

const fileName = computed(() => (language === 'typescript' ? 'main.ts' : 'main.js'))

function confirmReset() {
  confirmOpen.value = false
  emit('reset')
}

// Les touches mobiles { } ( ) … passent par ici jusqu'à l'éditeur (specs-site.md § 7.4).
defineExpose({
  insertAtCursor(text: string, cursorOffset?: number) {
    editor.value?.insertAtCursor(text, cursorOffset)
  },
})
</script>

<template>
  <div
    class="rounded-card border-border bg-code-bg flex min-h-0 flex-1 flex-col overflow-hidden border"
  >
    <div
      class="border-border flex h-12.5 shrink-0 items-center justify-between gap-3 border-b pr-2.5 pl-4"
    >
      <p class="flex min-w-0 items-center gap-3">
        <span class="text-meta text-code-comment font-mono">{{ fileName }}</span>
        <span v-if="draftStatus === 'saved'" class="text-text-muted truncate text-xs"
          >Brouillon enregistré</span
        >
        <span v-else-if="draftStatus === 'failed'" class="text-danger truncate text-xs">
          Brouillon non enregistré : le stockage du navigateur est indisponible.
        </span>
      </p>

      <div class="flex items-center gap-2">
        <UiIconButton
          icon="lucide:rotate-ccw"
          label="Revenir au code de départ"
          @click="confirmOpen = true"
        />
        <div class="hidden items-center gap-2 md:flex">
          <UiButton
            dense
            variant="secondary"
            icon="lucide:play"
            :disabled="pending !== null"
            :loading="pending === 'run'"
            loading-label="Exécution…"
            @click="emit('run')"
          >
            Exécuter
          </UiButton>
          <UiButton
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
    </div>

    <div
      v-if="starterChanged"
      class="border-border bg-surface flex items-center justify-between gap-3 border-b px-4 py-2 text-sm"
    >
      <span class="text-text">Le code de départ de cet exercice a changé.</span>
      <button
        type="button"
        class="text-primary cursor-pointer font-semibold"
        @click="confirmOpen = true"
      >
        Réinitialiser
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <UiCodeEditor ref="editor" v-model="code" :language="language" @run="emit('run')" />
    </div>

    <p
      v-if="error"
      role="alert"
      class="border-danger bg-danger-soft text-danger flex items-center gap-2 border-t px-4 py-2.5 text-sm"
    >
      <Icon name="lucide:circle-x" class="size-4 shrink-0" />
      {{ error }}
    </p>

    <UiDialog v-model:open="confirmOpen" title="Revenir au code de départ ?">
      <p class="text-text-muted text-sm">Votre brouillon sera perdu.</p>
      <template #actions>
        <UiButton dense variant="secondary" @click="confirmOpen = false">Annuler</UiButton>
        <UiButton dense @click="confirmReset">Réinitialiser</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
