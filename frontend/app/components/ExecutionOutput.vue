<script setup lang="ts">
/**
 * Ce que le programme a produit : sorties, code de sortie, duree, signal.
 * N'est jamais un verdict : un code 0 ne dit pas qu'une solution est juste.
 */
const props = defineProps<{ result: ExecutionResult }>()

const succeeded = computed(() => props.result.status === 'OK' && props.result.run.code === 0)

const title = computed(() => {
  if (succeeded.value) {
    return 'Exécution réussie'
  }
  // Termine, mais en echec : le code de sortie dit pourquoi.
  return props.result.status === 'OK'
    ? `Terminé avec le code de sortie ${props.result.run.code ?? '—'}`
    : props.result.label
})

const silent = computed(() => props.result.run.stdout === '' && props.result.run.stderr === '')
</script>

<template>
  <section class="bg-code-surface text-code-foreground overflow-hidden rounded-xl">
    <h3
      class="text-body-sm px-4 py-2 font-semibold"
      :class="succeeded ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'"
    >
      {{ title }}
    </h3>

    <div class="grid gap-3 p-4">
      <!-- Rendu comme du texte : les retours a la ligne en sont, jamais des « \n ». -->
      <div v-if="result.run.stdout" class="grid gap-1">
        <p class="text-xs tracking-wide uppercase opacity-60">Sortie standard</p>
        <pre class="overflow-x-auto font-mono text-sm whitespace-pre-wrap">{{
          result.run.stdout
        }}</pre>
      </div>

      <div v-if="result.run.stderr" class="grid gap-1">
        <p class="text-xs tracking-wide text-red-200 uppercase">Sortie d’erreur</p>
        <pre class="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-red-200">{{
          result.run.stderr
        }}</pre>
      </div>

      <p v-if="silent" class="text-body-sm opacity-75">
        Le programme s’est exécuté sans rien afficher. Une fonction déclarée mais jamais appelée ne
        produit aucune sortie : ajoutez un <code class="font-mono">console.log(…)</code>.
      </p>

      <dl class="text-body-sm flex flex-wrap gap-x-6 gap-y-1 opacity-75">
        <div class="flex gap-1">
          <dt>Code de sortie :</dt>
          <dd>{{ result.run.code ?? '—' }}</dd>
        </div>
        <div class="flex gap-1">
          <dt>Durée :</dt>
          <dd>{{ result.run.wall_time ?? '—' }} ms</dd>
        </div>
        <div v-if="result.run.signal" class="flex gap-1">
          <dt>Signal :</dt>
          <dd>{{ result.run.signal }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
