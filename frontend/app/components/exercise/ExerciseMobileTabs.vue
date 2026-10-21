<script setup lang="ts">
import type { MobileExerciseTab } from '~/types/exercise'

const tab = defineModel<MobileExerciseTab>({ required: true })

interface Props {
  badge: { passed: number; total: number } | null
}

defineProps<Props>()

const emit = defineEmits<{
  insert: [text: string, cursorOffset?: number]
}>()

const TABS: readonly { id: MobileExerciseTab; label: string; icon: string }[] = [
  { id: 'instructions', label: 'Consigne', icon: 'lucide:file-text' },
  { id: 'lesson', label: 'Leçon', icon: 'lucide:book-open' },
  { id: 'code', label: 'Code', icon: 'lucide:code' },
  { id: 'result', label: 'Résultat', icon: 'lucide:check-square' },
]

const QUICK_KEYS: readonly { label: string; text: string; offset?: number }[] = [
  { label: '{ }', text: '{}', offset: 1 },
  { label: '( )', text: '()', offset: 1 },
  { label: '[ ]', text: '[]', offset: 1 },
  { label: '=>', text: '=> ', offset: 3 },
  { label: '" "', text: '""', offset: 1 },
  { label: 'Tab', text: '  ', offset: 2 },
]
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden md:hidden">
    <!-- Onglets 4 colonnes égales -->
    <div role="tablist" class="grid grid-cols-4 border-b border-border bg-surface shrink-0">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        class="flex flex-col items-center justify-center py-2.5 text-xs font-semibold transition-colors cursor-pointer"
        :class="[
          tab === t.id
            ? 'text-primary border-b-2 border-primary -mb-px'
            : 'text-text-muted hover:text-text',
        ]"
        @click="tab = t.id"
      >
        <div class="relative flex items-center justify-center">
          <Icon :name="t.icon" class="size-4" />
          <span
            v-if="t.id === 'result' && badge"
            class="absolute -top-1 -right-3 flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold"
            :class="badge.passed === badge.total ? 'bg-success text-on-primary' : 'bg-danger text-on-primary'"
          >
            {{ badge.passed }}
          </span>
        </div>
        <span class="mt-1 text-[11px]">{{ t.label }}</span>
      </button>
    </div>

    <!-- Rangée de touches rapides au-dessus de l'éditeur dans l'onglet Code -->
    <div
      v-if="tab === 'code'"
      class="flex items-center gap-1.5 border-b border-border bg-surface-muted px-2 py-1.5 overflow-x-auto shrink-0"
    >
      <button
        v-for="k in QUICK_KEYS"
        :key="k.label"
        type="button"
        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] border border-border bg-surface font-mono text-xs font-semibold text-text active:bg-surface-muted cursor-pointer"
        @click="emit('insert', k.text, k.offset)"
      >
        {{ k.label }}
      </button>
    </div>

    <!-- Conteneur défilant des panneaux -->
    <div class="flex-1 overflow-y-auto">
      <div v-show="tab === 'instructions'" class="p-4">
        <slot name="instructions" />
      </div>
      <div v-show="tab === 'lesson'" class="p-4">
        <slot name="lesson" />
      </div>
      <div v-show="tab === 'code'" class="h-full">
        <slot name="code" />
      </div>
      <div v-show="tab === 'result'" class="h-full">
        <slot name="result" />
      </div>
    </div>
  </div>
</template>
