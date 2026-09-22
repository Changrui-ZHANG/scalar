<script setup lang="ts">
/**
 * Bac a sable : on colle un script Node complet, on l'envoie, on lit ce que le
 * programme a produit. Le code n'est pas enrobe avant l'envoi -- les numeros de
 * ligne des erreurs correspondent donc exactement a ce qui est saisi ici.
 */

interface ExecutionRun {
  readonly stdout: string
  readonly stderr: string
  readonly output: string
  readonly code: number | null
  readonly signal: string | null
  readonly status: string | null
  readonly message?: string | null
  readonly cpu_time?: number
  readonly wall_time?: number
  readonly memory?: number
}

interface ExecutionResult {
  readonly status: string
  readonly label: string
  readonly run: ExecutionRun
}

interface ApiResponse<T> {
  readonly success: boolean
  readonly data: T | null
  readonly error: string | null
}

/**
 * Montre un script qui ecrit sur la sortie standard. Une simple declaration de
 * fonction s'executerait sans erreur et ne produirait rien -- c'est la premiere
 * surprise a desamorcer.
 */
const EXEMPLE = `// Le résultat affiché est ce que le script écrit sur la sortie standard.
function addition(a, b) {
  return a + b
}

console.log(addition(2, 3))`

useSeoMeta({
  title: 'Exécuter un script — Scalar',
  description: "Coller un script Node.js et lire le resultat de son execution isolee.",
})

const { public: configPublique } = useRuntimeConfig()

const code = ref('')
const resultat = ref<ExecutionResult | null>(null)
const erreur = ref('')
const enCours = ref(false)

const peutEnvoyer = computed(() => code.value.trim() !== '' && !enCours.value)

/** Un script valide qui n'appelle jamais rien ne produit aucune sortie. */
const sortieVide = computed(
  () =>
    resultat.value !== null &&
    resultat.value.run.stdout === '' &&
    resultat.value.run.stderr === '',
)

async function envoyer() {
  if (!peutEnvoyer.value) {
    return
  }

  enCours.value = true
  erreur.value = ''
  resultat.value = null

  try {
    const reponse = await $fetch<ApiResponse<ExecutionResult>>(
      `${configPublique.apiBase}/executions`,
      { method: 'POST', body: { code: code.value } },
    )

    if (reponse.success && reponse.data) {
      resultat.value = reponse.data
    } else {
      erreur.value = reponse.error ?? "Le moteur n'a rien renvoyé."
    }
  } catch (err: unknown) {
    // `$fetch` leve sur 4xx et 5xx : l'enveloppe d'erreur de l'API est alors
    // portee par `data`. On n'affiche jamais autre chose que son champ `error`.
    const enveloppe = (err as { data?: ApiResponse<never> }).data
    erreur.value = enveloppe?.error ?? "Le service est injoignable pour l'instant."
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <section class="grid gap-6 py-8">
    <header class="grid gap-1">
      <h1 class="font-display text-3xl">Exécuter un script Node.js</h1>
      <p class="text-body-sm text-muted-foreground">
        Le résultat affiché est ce que le script écrit sur la sortie standard.
      </p>
    </header>

    <form class="grid gap-3" @submit.prevent="envoyer">
      <textarea
        v-model="code"
        rows="14"
        spellcheck="false"
        :placeholder="EXEMPLE"
        class="bg-background text-foreground placeholder:text-muted-foreground w-full resize-y rounded-md border p-3 font-mono text-sm"
      />

      <button
        type="submit"
        :disabled="!peutEnvoyer"
        class="bg-foreground text-background justify-self-start rounded-md px-4 py-2 font-semibold disabled:opacity-40"
      >
        {{ enCours ? 'Exécution en cours…' : 'Envoyer' }}
      </button>
    </form>

    <p
      v-if="erreur"
      role="alert"
      class="rounded-md border border-red-500/50 p-3 text-red-600 dark:text-red-400"
    >
      {{ erreur }}
    </p>

    <div v-if="resultat" class="grid gap-4">
      <p class="font-semibold">{{ resultat.label }}</p>

      <!-- Rendu comme du texte, jamais a travers JSON.stringify : les retours a
           la ligne doivent en etre, pas apparaitre en « \n » litteraux. -->
      <div v-if="resultat.run.stdout" class="grid gap-1">
        <h2 class="text-body-sm text-muted-foreground">Sortie standard</h2>
        <pre
          class="overflow-x-auto rounded-md border p-3 font-mono text-sm whitespace-pre-wrap"
        >{{ resultat.run.stdout }}</pre>
      </div>

      <div v-if="resultat.run.stderr" class="grid gap-1">
        <h2 class="text-body-sm text-muted-foreground">Sortie d’erreur</h2>
        <pre
          class="overflow-x-auto rounded-md border border-red-500/50 p-3 font-mono text-sm whitespace-pre-wrap text-red-600 dark:text-red-400"
        >{{ resultat.run.stderr }}</pre>
      </div>

      <p v-if="sortieVide" class="text-body-sm text-muted-foreground">
        Le script s’est exécuté sans rien écrire. Une fonction déclarée mais
        jamais appelée ne produit aucune sortie — ajoutez un
        <code class="font-mono">console.log(…)</code>.
      </p>

      <dl class="text-body-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <div class="flex gap-1">
          <dt>Code de sortie</dt>
          <dd>{{ resultat.run.code ?? '—' }}</dd>
        </div>
        <div class="flex gap-1">
          <dt>Durée</dt>
          <dd>{{ resultat.run.wall_time ?? '—' }} ms</dd>
        </div>
        <div class="flex gap-1">
          <dt>CPU</dt>
          <dd>{{ resultat.run.cpu_time ?? '—' }} ms</dd>
        </div>
        <div v-if="resultat.run.signal" class="flex gap-1">
          <dt>Signal</dt>
          <dd>{{ resultat.run.signal }}</dd>
        </div>
      </dl>

      <details>
        <summary class="text-body-sm text-muted-foreground cursor-pointer">
          Réponse complète du moteur
        </summary>
        <pre class="mt-2 overflow-x-auto rounded-md border p-3 font-mono text-sm">{{
          JSON.stringify(resultat.run, null, 2)
        }}</pre>
      </details>
    </div>
  </section>
</template>
