<script setup lang="ts">
// Compte dans l'en-tête (desktop) : « Se connecter », ou l'email et « Se déconnecter ».
// Rien tant que la session n'est pas lue, pour ne pas faire clignoter le bouton.
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()

// Après connexion, on revient sur la page courante.
const loginLink = computed(() => ({ path: '/connexion', query: { redirect: route.fullPath } }))

async function onLogout() {
  await auth.logout()
  // Les chapitres Premium déjà affichés ne sont plus accessibles : on relit les données.
  await refreshNuxtData()
}
</script>

<template>
  <div v-if="auth.loaded" class="hidden items-center gap-2 md:flex">
    <NuxtLink
      v-if="!auth.account"
      :to="loginLink"
      class="text-ui text-text-muted hover:text-text font-medium transition-colors"
    >
      Se connecter
    </NuxtLink>

    <template v-else>
      <span class="text-ui text-text-muted flex max-w-48 items-center gap-1.5">
        <Icon name="lucide:circle-user" class="size-4 shrink-0" />
        <span class="truncate" :title="auth.account.email">{{ auth.account.email }}</span>
      </span>
      <button
        type="button"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        class="text-text-muted hover:bg-surface-muted hover:text-text inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px]"
        @click="onLogout"
      >
        <Icon name="lucide:log-out" class="size-4.5" />
      </button>
    </template>
  </div>
</template>
