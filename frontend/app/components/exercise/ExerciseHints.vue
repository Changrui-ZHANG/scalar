<script setup lang="ts">
// Indices de l'exercice (specs-site.md § 7.1, § 7.4), révélés un par un.
// - tab : onglet Indices (desktop) ; indices révélés, puis le suivant verrouillé.
// - inline : encadré dans la Consigne sur mobile ; le dernier indice révélé + « Indice suivant ».
interface Props {
  hints: readonly string[]
  revealed: number // nombre d'indices déjà révélés
  variant?: 'tab' | 'inline'
}

const { hints, revealed, variant = 'tab' } = defineProps<Props>()

const emit = defineEmits<{
  reveal: []
}>()

const revealedHints = computed(() => hints.slice(0, revealed))
const hasNext = computed(() => revealed < hints.length)
const lastHint = computed(() => (revealed > 0 ? hints[revealed - 1] : null))
</script>

<template>
  <div
    v-if="variant === 'inline' && hints.length > 0"
    class="rounded-control bg-primary-soft flex flex-col gap-2 px-3.5 py-3"
  >
    <div class="flex items-center justify-between">
      <p class="text-meta text-primary flex items-center gap-1.75 font-bold">
        <Icon name="lucide:lightbulb" class="size-4" />
        <template v-if="revealed > 0">Indice {{ revealed }} sur {{ hints.length }}</template>
        <template v-else>{{ countLabel(hints.length, 'indice', 'indices') }}</template>
      </p>
      <button
        v-if="hasNext"
        type="button"
        class="text-meta text-primary min-h-11 cursor-pointer font-semibold"
        @click="emit('reveal')"
      >
        <template v-if="revealed === 0">Afficher un indice</template>
        <template v-else>Indice suivant</template>
      </button>
    </div>
    <ContentRichText v-if="lastHint" :source="lastHint" :language="null" variant="compact" />
  </div>

  <div v-else-if="variant === 'tab'" class="flex flex-col gap-3.5">
    <p class="text-ui text-text-muted leading-snug">
      Les indices vont du plus vague au plus précis. Ils ne comptent pas contre vous.
    </p>

    <div
      v-for="(hint, index) in revealedHints"
      :key="index"
      class="rounded-control border-border bg-surface flex flex-col gap-1.5 border px-4 py-3.5"
    >
      <p class="text-small text-primary flex items-center gap-2 font-bold">
        <Icon name="lucide:lightbulb" class="size-4" />
        Indice {{ index + 1 }}
      </p>
      <ContentRichText :source="hint" :language="null" variant="compact" />
    </div>

    <div
      v-if="hasNext"
      class="rounded-control border-border flex items-center justify-between gap-3 border px-4 py-3.5"
    >
      <p class="text-ui text-text-muted flex items-center gap-2">
        <Icon name="lucide:lock" class="size-4" />
        Indice {{ revealed + 1 }}
      </p>
      <button
        type="button"
        class="border-border bg-surface text-small text-text hover:bg-surface-muted cursor-pointer rounded-lg border px-3 py-1.75 font-semibold"
        @click="emit('reveal')"
      >
        Afficher
      </button>
    </div>
  </div>
</template>
