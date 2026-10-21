<script setup lang="ts">
import type { ExecutionResult } from '@scalar/shared/api'

interface Props {
  result: ExecutionResult | null
  pending: boolean
}

const props = defineProps<Props>()

const headerLabel = computed(() => {
  if (!props.result) return null
  const run = props.result.run
  const time = run.wall_time !== null && run.wall_time !== undefined ? ` · ${run.wall_time} ms` : ''
  if (props.result.status === 'OK') {
    return `Exécution réussie${time}`
  }
  return props.result.label
})
</script>

<template>
  <div class="flex flex-col rounded-[14px] border border-border bg-surface overflow-hidden">
    <!-- Barre haute du panneau de sortie -->
    <div class="flex items-center justify-between border-b border-border bg-surface-muted/30 px-4 py-2.5">
      <span class="text-xs font-bold uppercase tracking-wider text-text-muted">
        Sortie standard
      </span>

      <span
        v-if="headerLabel"
        class="text-xs font-mono"
        :class="result?.status === 'OK' ? 'text-success font-semibold' : 'text-danger font-semibold'"
      >
        {{ headerLabel }}
      </span>
    </div>

    <!-- Corps de la sortie -->
    <div class="flex-1 p-4 font-mono text-xs leading-relaxed min-h-[140px] bg-code-bg">
      <div v-if="pending" class="text-text-muted animate-pulse">
        Exécution du script en cours…
      </div>

      <div v-else-if="!result" class="text-text-muted italic">
        Lancez le script pour voir sa sortie.
      </div>

      <div v-else class="flex flex-col gap-2">
        <pre v-if="result.run.stdout" class="whitespace-pre-wrap text-code-text"><code>{{ result.run.stdout }}</code></pre>
        <pre v-if="result.run.stderr" class="whitespace-pre-wrap text-danger"><code>{{ result.run.stderr }}</code></pre>

        <div v-if="!result.run.stdout && !result.run.stderr" class="text-text-muted italic">
          Le script n'a rien affiché.
        </div>
      </div>
    </div>

    <!-- Rappel -->
    <div class="border-t border-border px-4 py-2.5 text-[11px] text-text-muted bg-surface">
      Ce qui s'affiche ici est ce que le script écrit sur la sortie standard (console.log).
    </div>
  </div>
</template>
