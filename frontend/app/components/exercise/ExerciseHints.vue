<script setup lang="ts">
interface Props {
  hints: readonly string[]
  revealed: number
  variant?: 'tab' | 'inline'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'tab',
})

const emit = defineEmits<{
  reveal: []
}>()

const hasNextHint = computed(() => props.revealed < props.hints.length)
</script>

<template>
  <!-- Variante inline pour consigne mobile (§ 7.4) -->
  <div
    v-if="variant === 'inline' && hints.length > 0"
    class="my-4 rounded-[12px] bg-primary-soft p-4 border border-primary/20 flex flex-col gap-3"
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-primary flex items-center gap-1.5">
        <Icon name="lucide:lightbulb" class="size-4" />
        Indice {{ revealed }} sur {{ hints.length }}
      </span>

      <button
        v-if="hasNextHint"
        type="button"
        class="text-xs font-bold text-primary underline cursor-pointer"
        @click="emit('reveal')"
      >
        {{ revealed === 0 ? 'Afficher un indice' : 'Indice suivant' }}
      </button>
    </div>

    <!-- Dernier indice révélé affiché -->
    <p v-if="revealed > 0" class="text-xs text-text leading-relaxed">
      {{ hints[revealed - 1] }}
    </p>
  </div>

  <!-- Variante tab pour desktop (§ 7.1) -->
  <div v-else class="flex flex-col gap-4 py-2">
    <p class="text-xs text-text-muted italic">
      Les indices vont du plus vague au plus précis. Ils ne comptent pas contre vous.
    </p>

    <!-- Liste des indices révélés -->
    <div
      v-for="(hint, index) in hints.slice(0, revealed)"
      :key="index"
      class="rounded-[10px] border border-border bg-surface p-3.5 flex flex-col gap-1.5"
    >
      <div class="flex items-center gap-2 text-xs font-bold text-primary">
        <Icon name="lucide:lightbulb" class="size-3.5" />
        <span>Indice {{ index + 1 }}</span>
      </div>
      <p class="text-xs text-text leading-relaxed">
        {{ hint }}
      </p>
    </div>

    <!-- Prochain indice verrouillé -->
    <div
      v-if="hasNextHint"
      class="rounded-[10px] border border-dashed border-border bg-surface-muted/30 p-4 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2 text-xs text-text-muted">
        <Icon name="lucide:lock" class="size-4" />
        <span>Indice {{ revealed + 1 }} sur {{ hints.length }}</span>
      </div>

      <UiButton
        variant="secondary"
        dense
        @click="emit('reveal')"
      >
        Afficher
      </UiButton>
    </div>
  </div>
</template>
