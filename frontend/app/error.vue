<script setup lang="ts">
// Page d'erreur (specs-site.md § 11) :
// - 404 : page introuvable ;
// - 403 : chapitre Premium ;
// - autre (API injoignable, 5xx) : contenu momentanément indisponible.
import type { NuxtError } from '#app'
import { useAuthStore } from '~/stores/auth'

interface Props {
  error: NuxtError
}

const { error } = defineProps<Props>()

const isNotFound = computed(() => error.statusCode === 404)
// 403 : le seul refus du contenu public est un chapitre Premium.
const isPremium = computed(() => error.statusCode === 403)

const auth = useAuthStore()
const route = useRoute()

// En cas d'erreur, Nuxt affiche cette page à la place d'app.vue :
// on lit donc ici aussi la session, pour l'en-tête et le bouton « Se connecter ».
onMounted(() => {
  if (!auth.loaded) {
    auth.loadSession()
  }
})

function goTo(path: string) {
  clearError({ redirect: path })
}

// « Réessayer » : on efface l'erreur et on recharge la page, qui redemande ses données.
function retry() {
  clearError()
  reloadNuxtApp()
}
</script>

<template>
  <NuxtLayout name="default">
    <div class="flex items-center justify-center px-4 py-24 md:py-36">
      <UiStatePanel
        v-if="isNotFound"
        icon="lucide:map-pin-off"
        title="Page introuvable"
        text="Cette adresse ne mène à aucune page. Le lien est peut-être ancien, ou le contenu a été retiré."
      >
        <template #actions>
          <UiButton @click="goTo('/parcours')">Voir les parcours</UiButton>
          <UiButton variant="secondary" @click="goTo('/')">Accueil</UiButton>
        </template>
      </UiStatePanel>

      <UiStatePanel
        v-else-if="isPremium"
        icon="lucide:lock"
        title="Chapitre réservé aux abonnés Premium"
        text="Les premiers chapitres de chaque parcours sont gratuits. La suite est réservée aux abonnés Premium."
      >
        <template #actions>
          <!-- Un abonné non connecté retrouve son accès en se connectant. -->
          <UiButton
            v-if="!auth.account"
            @click="goTo(`/connexion?redirect=${encodeURIComponent(route.fullPath)}`)"
          >
            Se connecter
          </UiButton>
          <UiButton :variant="auth.account ? 'primary' : 'secondary'" @click="goTo('/parcours')">
            Voir les parcours
          </UiButton>
        </template>
      </UiStatePanel>

      <UiStatePanel
        v-else
        icon="lucide:cloud-off"
        title="Contenu momentanément indisponible"
        text="Le serveur ne répond pas pour l’instant. Votre code et votre progression sont conservés dans ce navigateur."
      >
        <template #actions>
          <UiButton icon="lucide:rotate-cw" @click="retry">Réessayer</UiButton>
          <UiButton variant="secondary" @click="goTo('/exercices')">Ouvrir le bac à sable</UiButton>
        </template>
      </UiStatePanel>
    </div>
  </NuxtLayout>
</template>
