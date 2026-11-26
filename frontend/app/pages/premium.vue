<script setup lang="ts">
// Offre Premium : choisir une formule (paiement chez Stripe), ou gérer son abonnement.
// Stripe renvoie ici après le paiement : /premium?checkout=success (ou cancel).
import type { SubscriptionPlan, SubscriptionView } from '~/types/billing'
import { usePageSeo } from '~/composables/usePageSeo'
import { fetchSubscription, openBillingPortal, startCheckout } from '~/services/billing'
import { useAuthStore } from '~/stores/auth'
import { apiErrorMessage } from '~/utils/apiError'
import { formatLongDate } from '~/utils/formatDate'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Premium'],
  description:
    'Scalar Premium : tous les chapitres de chaque parcours et les certificats de fin de parcours.',
  type: 'website',
})

const route = useRoute()
const auth = useAuthStore()

const view = ref<SubscriptionView | null>(null)
const loading = ref(false)
// Formule en cours d'envoi vers Stripe, ou « portal » pour la gestion de l'abonnement.
const pending = ref<SubscriptionPlan | 'portal' | null>(null)
const error = ref<string | null>(null)

const checkout = computed(() => route.query.checkout)

const plans: { id: SubscriptionPlan; name: string; billing: string }[] = [
  { id: 'monthly', name: 'Mensuel', billing: 'Facturé chaque mois, sans engagement.' },
  { id: 'yearly', name: 'Annuel', billing: 'Facturé une fois par an.' },
]

const planNames: Record<SubscriptionPlan, string> = { monthly: 'mensuel', yearly: 'annuel' }

// Phrase d'état de l'abonnement d'un abonné.
const subscriptionText = computed(() => {
  const subscription = view.value?.subscription
  if (!subscription) {
    // Premium sans abonnement : compte admin.
    return 'Votre compte a accès à tous les chapitres.'
  }
  const end = formatLongDate(subscription.currentPeriodEnd)
  if (subscription.status === 'past_due') {
    return `Le dernier paiement a échoué. Mettez à jour votre moyen de paiement avant le ${end}.`
  }
  return `Abonnement ${planNames[subscription.plan]}, renouvelé le ${end}.`
})

async function loadSubscription() {
  if (!auth.account) {
    view.value = null
    return
  }
  loading.value = true
  try {
    view.value = await fetchSubscription()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Impossible de lire votre abonnement. Réessayez.')
  } finally {
    loading.value = false
  }
}

// Le Premium s'ouvre quand Stripe prévient le backend, quelques secondes après
// le retour : on relit l'abonnement jusqu'à 5 fois, toutes les 2 secondes.
async function waitForPremium() {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (view.value?.premium) return
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await loadSubscription()
  }
}

async function choose(plan: SubscriptionPlan) {
  error.value = null
  pending.value = plan
  try {
    window.location.assign(await startCheckout(plan))
  } catch (err) {
    error.value = apiErrorMessage(err, 'Le paiement n’a pas pu commencer. Réessayez.')
    pending.value = null
  }
}

async function manage() {
  error.value = null
  pending.value = 'portal'
  try {
    window.location.assign(await openBillingPortal())
  } catch (err) {
    error.value = apiErrorMessage(err, 'La gestion de l’abonnement n’a pas pu s’ouvrir. Réessayez.')
    pending.value = null
  }
}

// La session n'est connue qu'une fois la page montée (app.vue) : on attend qu'elle soit lue.
watch(
  () => [auth.loaded, auth.account?.id],
  async () => {
    if (!auth.loaded) return
    await loadSubscription()
    if (checkout.value === 'success') {
      await waitForPremium()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 md:py-20">
    <div class="flex flex-col gap-3">
      <span class="text-small text-primary font-semibold">Scalar Premium</span>
      <h1 class="font-display text-title text-text font-semibold md:text-4xl">
        Tous les chapitres, jusqu’au bout du parcours
      </h1>
      <p class="text-lede text-text-muted">
        Les premiers chapitres de chaque parcours restent gratuits. Premium ouvre la suite.
      </p>
    </div>

    <ul class="flex flex-col gap-3">
      <li
        v-for="benefit in [
          'Tous les chapitres de chaque parcours, du niveau débutant à l’écosystème.',
          'Les certificats de fin de parcours, vérifiables en ligne.',
        ]"
        :key="benefit"
        class="text-body text-text flex items-start gap-3"
      >
        <Icon name="lucide:check" class="text-success mt-1 size-4.5 shrink-0" />
        <span>{{ benefit }}</span>
      </li>
    </ul>

    <!-- Retour de Stripe -->
    <p
      v-if="checkout === 'success' && !view?.premium"
      role="status"
      class="bg-primary-soft text-primary text-ui rounded-row px-4 py-3 font-medium"
    >
      Paiement reçu. Votre accès Premium s’active dans quelques secondes.
    </p>
    <p
      v-else-if="checkout === 'cancel'"
      role="status"
      class="bg-surface-muted text-text-muted text-ui rounded-row px-4 py-3 font-medium"
    >
      Paiement annulé : rien n’a été prélevé.
    </p>

    <p
      v-if="error"
      role="alert"
      class="bg-danger-soft text-danger text-ui rounded-row px-4 py-3 font-medium"
    >
      {{ error }}
    </p>

    <!-- Session ou abonnement en cours de lecture -->
    <p v-if="!auth.loaded || loading" class="text-ui text-text-muted">Chargement…</p>

    <!-- Visiteur : il faut un compte pour s'abonner -->
    <div
      v-else-if="!auth.account"
      class="border-border bg-surface rounded-card flex flex-col gap-4 border p-6"
    >
      <h2 class="font-display text-text text-xl font-semibold">Créez un compte pour vous abonner</h2>
      <p class="text-body text-text-muted">
        L’abonnement est rattaché à votre compte, avec votre progression.
      </p>
      <div class="flex flex-wrap gap-3">
        <UiButton to="/inscription?redirect=/premium">Créer un compte</UiButton>
        <UiButton variant="secondary" to="/connexion?redirect=/premium">Se connecter</UiButton>
      </div>
    </div>

    <!-- Abonné (ou admin) -->
    <div
      v-else-if="view?.premium"
      class="border-border bg-surface rounded-card flex flex-col gap-4 border p-6"
    >
      <div class="flex items-center gap-2.5">
        <Icon name="lucide:badge-check" class="text-success size-6" />
        <h2 class="font-display text-text text-xl font-semibold">Vous êtes Premium</h2>
      </div>
      <p class="text-body text-text-muted">{{ subscriptionText }}</p>
      <div class="flex flex-wrap gap-3">
        <UiButton to="/parcours">Voir les parcours</UiButton>
        <UiButton
          v-if="view.subscription"
          variant="secondary"
          :loading="pending === 'portal'"
          loading-label="Ouverture…"
          @click="manage"
        >
          Gérer mon abonnement
        </UiButton>
      </div>
    </div>

    <!-- Compte gratuit : choisir une formule -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="border-border bg-surface rounded-card flex flex-col gap-4 border p-6"
      >
        <div class="flex flex-col gap-1">
          <h2 class="font-display text-text text-xl font-semibold">{{ plan.name }}</h2>
          <p class="text-ui text-text-muted">{{ plan.billing }}</p>
        </div>
        <UiButton
          :variant="plan.id === 'yearly' ? 'primary' : 'secondary'"
          :loading="pending === plan.id"
          loading-label="Ouverture du paiement…"
          :disabled="pending !== null"
          @click="choose(plan.id)"
        >
          Choisir la formule {{ planNames[plan.id] }}
        </UiButton>
      </div>
      <p class="text-small text-text-muted md:col-span-2">
        Le prix s’affiche sur la page de paiement sécurisée de Stripe, avant toute validation.
        Résiliable à tout moment depuis cette page.
      </p>
    </div>
  </div>
</template>
