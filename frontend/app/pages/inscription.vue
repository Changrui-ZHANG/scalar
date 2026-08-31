<script setup lang="ts">
import * as v from 'valibot'
import { LONGUEUR_MIN_MOT_DE_PASSE, schemaInscription } from '@scalar/shared/inscription.ts'
import { enViolations } from '@scalar/shared/violations.ts'
import type { CorpsErreur, Violation } from '@scalar/shared/erreurs.ts'
import type { ChargeUtileSession } from '@scalar/shared/session.ts'
// Importé explicitement, et non par l'auto-import de Nuxt : les imports issus
// d'un balayage de répertoire ne sont pas injectés sous l'environnement de
// test, où le composant est monté directement. Un import qui ne tient que
// pendant la construction rendrait le composant intestable.
import { useSessionStore } from '~/stores/session'
// Chemins de fichier plutot que le baril `index.ts` de shadcn-vue : celui-ci
// exporte aussi la fabrique de variantes, et l'import de repertoire ne se
// resout pas sous l'environnement de test.
import Button from '../components/ui/button/Button.vue'
import Input from '../components/ui/input/Input.vue'
import Label from '../components/ui/label/Label.vue'

useSeoMeta({
  title: 'Créer un compte — Scalar',
  description: 'Créer un compte Scalar pour passer le Diagnostic et suivre un Parcours.',
})

const { $api } = useNuxtApp()
const store = useSessionStore()

const nomAffiche = ref('')
const email = ref('')
const motDePasse = ref('')

const envoiEnCours = ref(false)
const violations = ref<readonly Violation[]>([])
const erreurGenerale = ref<string | null>(null)

// La politique est composée depuis le nombre déclaré, jamais recopiée : une
// phrase écrite à la main cesserait d'être vraie le jour où le plancher bouge.
const politiqueMotDePasse = `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères. Aucune autre contrainte : ni majuscule, ni chiffre, ni caractère spécial n’est exigé.`

// Un message par champ, indexe par le `chemin` que porte la violation. Sous
// forme derivee plutot que de fonction appelee depuis le gabarit : le calcul
// est mis en cache, et le gabarit se lit sans parenthese.
const messages = computed<Record<string, string | undefined>>(() =>
  Object.fromEntries(violations.value.map((violation) => [violation.chemin, violation.message])),
)

async function envoyer() {
  if (envoiEnCours.value) {
    return
  }

  erreurGenerale.value = null

  const saisie = {
    displayName: nomAffiche.value,
    email: email.value,
    motDePasse: motDePasse.value,
  }

  // Validation par le schéma partagé, avant l'appel. Ce n'est pas une
  // politesse : l'inscription porte un plafond de débit serré, et une faute de
  // frappe envoyée au serveur consommerait une des tentatives autorisées.
  const resultat = v.safeParse(schemaInscription, saisie)

  if (!resultat.success) {
    // La traduction vient de l'espace partagé : ce sont exactement les
    // `violations` que le serveur produirait sur la même saisie.
    violations.value = enViolations(resultat.issues)

    return
  }

  violations.value = []
  envoiEnCours.value = true

  try {
    const compte = await $api<ChargeUtileSession>('/accounts', {
      method: 'POST',
      body: resultat.output,
    })

    store.ouvrir(compte)
    await navigateTo('/tableau-de-bord')
  } catch (erreur) {
    const corps = (erreur as { data?: CorpsErreur }).data

    // Le message servi vient du catalogue d'erreurs, jamais d'une exception
    // réseau : l'écran ne réécrit pas ce que le serveur a déjà formulé.
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
    <h1 class="font-display text-display-sm text-foreground">Créer un compte</h1>
    <p class="text-body text-foreground mt-3">
      Trois informations suffisent. Vous atterrissez ensuite sur votre tableau de bord.
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
        <Label for="nom-affiche">Nom affiché</Label>
        <Input
          id="nom-affiche"
          v-model="nomAffiche"
          name="nom-affiche"
          autocomplete="name"
          class="h-11 rounded-sm"
          :aria-invalid="messages.displayName !== undefined"
          :aria-describedby="messages.displayName ? 'erreur-nom-affiche' : undefined"
        />
        <p
          v-if="messages.displayName"
          id="erreur-nom-affiche"
          class="text-body-sm text-destructive"
        >
          {{ messages.displayName }}
        </p>
      </div>

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
        <!-- Énoncée avant le champ, et lisible sans avoir rien saisi : une
             politique qui n'apparaît qu'en réaction à un échec arrive toujours
             trop tard. En `foreground` et non en texte atténué — elle porte une
             information nécessaire à l'action. -->
        <p id="politique-mot-de-passe" class="text-body-sm text-foreground">
          {{ politiqueMotDePasse }}
        </p>
        <Input
          id="mot-de-passe"
          v-model="motDePasse"
          name="mot-de-passe"
          type="password"
          autocomplete="new-password"
          class="h-11 rounded-sm"
          :aria-invalid="messages.motDePasse !== undefined"
          :aria-describedby="
            messages.motDePasse
              ? 'politique-mot-de-passe erreur-mot-de-passe'
              : 'politique-mot-de-passe'
          "
        />
        <p
          v-if="messages.motDePasse"
          id="erreur-mot-de-passe"
          class="text-body-sm text-destructive"
        >
          {{ messages.motDePasse }}
        </p>
      </div>

      <!-- Le seul appel à l'action de marque de cet écran. `min-h-11` vaut
           44 px : le remplissage seul donnerait 38 à 41 px et raterait le
           plancher de cible que le système s'impose. -->
      <Button
        type="submit"
        size="lg"
        class="min-h-11 rounded-md px-5 font-bold"
        :disabled="envoiEnCours"
      >
        {{ envoiEnCours ? 'Création en cours' : 'Créer mon compte' }}
      </Button>
    </form>
  </section>
</template>
