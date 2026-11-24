<script setup lang="ts">
// Panneau Sortie du bac à sable (specs-site.md § 8).
import type { ExecutionResult } from '@scalar/shared/api'

interface Props {
  result: ExecutionResult | null
  pending: boolean
}

const { result, pending } = defineProps<Props>()
</script>

<template>
  <div
    class="rounded-card border-border bg-surface flex flex-col gap-3 border px-4.5 py-4 md:w-110 md:shrink-0"
    aria-live="polite"
  >
    <div v-if="result" class="flex items-center justify-between gap-3">
      <p
        v-if="result.status === 'OK'"
        class="text-label text-text flex items-center gap-2 font-bold"
      >
        <Icon name="lucide:circle-check" class="text-success size-4" />
        Exécution réussie
      </p>
      <p v-else class="text-label text-text flex items-center gap-2 font-bold">
        <Icon name="lucide:circle-x" class="text-danger size-4" />
        Le script s’est arrêté sur une erreur
      </p>
      <span v-if="result.run.wall_time !== null" class="text-meta text-text-muted"
        >{{ result.run.wall_time }} ms</span
      >
    </div>
    <p v-else class="text-label text-text font-bold">Sortie</p>

    <div
      class="rounded-row bg-code-bg flex min-h-30 flex-col gap-1.5 px-3.5 py-3 font-mono text-sm"
    >
      <p v-if="pending" class="text-text-muted">Exécution…</p>
      <p v-else-if="!result" class="text-text-muted">Lancez le script pour voir sa sortie.</p>
      <template v-else>
        <p v-if="result.status !== 'OK'" class="text-danger font-sans">{{ result.label }}</p>
        <pre v-if="result.run.stdout" class="text-code-text whitespace-pre-wrap">{{
          result.run.stdout
        }}</pre>
        <pre v-if="result.run.stderr" class="text-danger whitespace-pre-wrap">{{
          result.run.stderr
        }}</pre>
        <p v-if="!result.run.stdout && !result.run.stderr" class="text-text-muted">
          Le script n’a rien affiché.
        </p>
      </template>
    </div>

    <p class="text-small text-text-muted leading-snug">
      Ce qui s’affiche ici est ce que le script écrit sur la sortie standard (console.log).
    </p>
  </div>
</template>
