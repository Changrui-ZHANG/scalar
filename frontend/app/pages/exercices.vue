<script setup lang="ts">
/**
 * Bac a sable : on colle un script Node complet, on l'execute, on lit ce que le
 * programme a produit. Hors des parcours : aucune progression n'est touchee.
 * Le code n'est pas enrobe avant l'envoi -- les numeros de ligne des erreurs
 * correspondent donc exactement a ce qui est saisi ici.
 */

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
  title: 'Bac à sable — Scalar',
  description: 'Écrire un script Node.js et lire le résultat de son exécution isolée.',
})

const code = ref('')
const { result, error, running, run } = useExecution()
</script>

<template>
  <div class="grid gap-8 py-10">
    <BreadcrumbTrail :items="[{ label: 'Accueil', to: '/' }, { label: 'Bac à sable' }]" />

    <header class="grid gap-2">
      <p class="eyebrow">Expérimenter</p>
      <h1 class="text-4xl font-semibold sm:text-5xl">Bac à sable</h1>
      <p class="text-muted-foreground max-w-prose">
        Écrivez un script Node.js et exécutez-le. Le résultat affiché est ce que le script écrit sur
        la sortie standard. Rien ici ne compte dans vos parcours.
      </p>
    </header>

    <form class="grid gap-3" @submit.prevent="run(code)">
      <CodeEditor
        id="script"
        v-model="code"
        label="Votre script"
        filename="main.js"
        :placeholder="EXEMPLE"
        :rows="16"
      />
      <button
        type="submit"
        :disabled="running || !code.trim()"
        class="btn-primary justify-self-start"
      >
        {{ running ? 'Exécution en cours…' : 'Exécuter' }}
      </button>
    </form>

    <div class="grid gap-4" aria-live="polite">
      <p v-if="error" role="alert" class="alert-error">{{ error }}</p>
      <ExecutionOutput v-if="result" :result="result" />
    </div>
  </div>
</template>
