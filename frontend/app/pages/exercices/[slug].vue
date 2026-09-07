<script setup lang="ts">
import type { ProjectionExercicePublique } from '@scalar/shared/exercise.ts'
import type { CorpsErreur } from '@scalar/shared/erreurs.ts'

const route = useRoute()
const { $api } = useNuxtApp()

const exercice = ref<ProjectionExercicePublique | null>(null)
const chargement = ref(true)
const erreur = ref<string | null>(null)

async function charger() {
  chargement.value = true
  erreur.value = null

  try {
    exercice.value = await $api<ProjectionExercicePublique>(
      `/exercises/${encodeURIComponent(route.params.slug as string)}`,
    )
  } catch (echec) {
    const corps = (echec as { data?: CorpsErreur }).data

    // Le message servi vient du catalogue d'erreurs, jamais d'une exception
    // reseau : l'ecran ne reecrit pas ce que le serveur a deja formule.
    erreur.value =
      corps?.message ??
      "Cet exercice n'a pas pu être chargé. Vérifiez votre connexion, puis réessayez."
  } finally {
    chargement.value = false
  }
}

// Charge des le montage de la page : le contenu de l'exercice n'existe pas
// avant l'appel, il n'y a rien a afficher par etapes.
await charger()

// Vue Router reutilise l'instance du composant en naviguant d'un exercice a
// un autre — seul le parametre de route change. Sans cet effet de bord, la
// page continuerait d'afficher le premier exercice charge.
watch(
  () => route.params.slug,
  () => charger(),
)

useSeoMeta({
  title: computed(() =>
    exercice.value ? `${exercice.value.title} — Scalar` : 'Exercice — Scalar',
  ),
})
</script>

<template>
  <section v-if="chargement" aria-live="polite">
    <p class="text-body text-muted-foreground">Chargement de l’exercice…</p>
  </section>

  <p
    v-else-if="erreur"
    role="alert"
    class="text-body-sm text-destructive border-destructive rounded-sm border p-3"
  >
    {{ erreur }}
  </p>

  <section v-else-if="exercice" class="grid gap-10 md:grid-cols-2">
    <!-- Panneau d'enonce : titre, texte de l'enonce, code de depart. -->
    <div>
      <h1 class="font-display text-display-sm text-foreground">{{ exercice.title }}</h1>
      <p class="text-body text-foreground mt-4 whitespace-pre-line">{{ exercice.statement }}</p>

      <h2 class="text-title text-foreground mt-8">Code de départ</h2>
      <pre
        class="bg-muted border-border mt-2 overflow-x-auto rounded-md border p-4"
      ><code class="font-mono text-body-sm">{{ exercice.starterCode }}</code></pre>
    </div>

    <!-- Ilot de tests : tests visibles avec leur code, puis le decompte des
         tests caches, jamais leur corps (AD-13). -->
    <div>
      <h2 class="text-title text-foreground">
        Tests ({{ exercice.testsVisibles.length }} visibles sur {{ exercice.totalTests }})
      </h2>

      <ul class="mt-4 flex flex-col gap-6">
        <li v-for="test in exercice.testsVisibles" :key="test.name">
          <p class="text-body-sm text-foreground font-semibold">{{ test.name }}</p>
          <p class="text-body-sm text-muted-foreground mt-1">{{ test.assertion }}</p>
          <pre
            class="bg-muted border-border mt-2 overflow-x-auto rounded-md border p-4"
          ><code class="font-mono text-body-sm">{{ test.code }}</code></pre>
        </li>
      </ul>

      <ul v-if="exercice.testsCaches.length > 0" class="mt-8 flex flex-col gap-2">
        <li
          v-for="test in exercice.testsCaches"
          :key="test.name"
          class="text-body-sm text-muted-foreground"
        >
          {{ test.name }} — test caché, son code n’est révélé qu’à l’exécution.
        </li>
      </ul>
    </div>
  </section>
</template>
