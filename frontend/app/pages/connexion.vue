<script setup lang="ts">
import * as v from 'valibot'
import { schemaConnexion } from '@scalar/shared/connexion.ts'
import { enViolations } from '@scalar/shared/violations.ts'
import type { CorpsErreur, Violation } from '@scalar/shared/erreurs.ts'
import type { ChargeUtileSession } from '@scalar/shared/session.ts'
import { useSessionStore } from '~/stores/session'
import Button from '../components/ui/button/Button.vue'
import Input from '../components/ui/input/Input.vue'
import Label from '../components/ui/label/Label.vue'

useSeoMeta({
  title: 'Se connecter — Scalar',
  description: 'Se connecter à votre compte Scalar pour accéder à votre tableau de bord.',
})

const { $api } = useNuxtApp()
const store = useSessionStore()

const email = ref('')
const motDePasse = ref('')

const envoiEnCours = ref(false)
const violations = ref<readonly Violation[]>([])
const erreurGenerale = ref<string | null>(null)

const messages = computed<Record<string, string | undefined>>(() =>
  Object.fromEntries(violations.value.map((violation) => [violation.chemin, violation.message])),
)

async function envoyer() {
  if (envoiEnCours.value) {
    return
  }

  erreurGenerale.value = null

  const saisie = {
    email: email.value,
    motDePasse: motDePasse.value,
  }

  const resultat = v.safeParse(schemaConnexion, saisie)

  if (!resultat.success) {
    violations.value = enViolations(resultat.issues)
    return
  }

  violations.value = []
  envoiEnCours.value = true

  try {
    const compte = await $api<ChargeUtileSession>('/sessions', {
      method: 'POST',
      body: resultat.output,
    })

    store.ouvrir(compte)
    await navigateTo('/tableau-de-bord')
  } catch (erreur) {
    const corps = (erreur as { data?: CorpsErreur }).data

    erreurGenerale.value =
      corps?.message ??
      'La demande n’a pas pu être envoyée. Vérifiez votre connexion, puis réessayez.'
    violations.value = corps?.violations ?? []
  } finally {
    envoiEnCours.value = false
  }
}
</script>

<template>
  <section class="py-section-y mx-auto w-full max-w-md">
    <h1 class="font-display text-display-sm text-foreground">Se connecter</h1>
    <p class="text-body text-foreground mt-3">
      Accédez à votre compte Scalar pour retrouver vos diagnostics et parcours.
    </p>

    <form class="mt-8 flex flex-col gap-6" novalidate @submit.prevent="envoyer">
      <p
        v-if="erreurGenerale"
        role="alert"
        class="text-body-sm text-destructive border-destructive rounded-sm border p-3"
      >
        {{ erreurGenerale }}
      </p>

      <div class="flex flex-col gap-2">
        <Label for="email">Adresse email</Label>
        <Input
          id="email"
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          class="h-11 rounded-sm"
          :aria-invalid="messages.email !== undefined"
          :aria-describedby="messages.email ? 'erreur-email' : undefined"
        />
        <p v-if="messages.email" id="erreur-email" class="text-body-sm text-destructive">
          {{ messages.email }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="mot-de-passe">Mot de passe</Label>
        <Input
          id="mot-de-passe"
          v-model="motDePasse"
          name="mot-de-passe"
          type="password"
          autocomplete="current-password"
          class="h-11 rounded-sm"
          :aria-invalid="messages.motDePasse !== undefined"
          :aria-describedby="messages.motDePasse ? 'erreur-mot-de-passe' : undefined"
        />
        <p
          v-if="messages.motDePasse"
          id="erreur-mot-de-passe"
          class="text-body-sm text-destructive"
        >
          {{ messages.motDePasse }}
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        class="min-h-11 rounded-md px-5 font-bold"
        :disabled="envoiEnCours"
      >
        {{ envoiEnCours ? 'Connexion en cours' : 'Se connecter' }}
      </Button>
    </form>

    <p class="text-body-sm text-muted-foreground mt-6 text-center">
      Pas encore de compte ?
      <NuxtLink
        to="/inscription"
        class="text-primary font-medium underline-offset-4 hover:underline"
      >
        Créer un compte
      </NuxtLink>
    </p>
  </section>
</template>
