<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const open = defineModel<boolean>({ default: false })

const auth = useAuthStore()
const route = useRoute()

// Après connexion ou inscription, on revient sur la page courante.
const redirect = computed(() => encodeURIComponent(route.fullPath))

function close() {
  open.value = false
}

async function onLogout() {
  close()
  await auth.logout()
  await refreshNuxtData()
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex md:hidden">
    <!-- Voile -->
    <div
      class="fixed inset-0 bg-[#0F1115]/50 transition-opacity"
      aria-hidden="true"
      @click="close"
    />

    <!-- Feuille de menu -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
      class="relative ml-auto flex h-full w-72 flex-col bg-surface p-6 shadow-2xl border-l border-border"
    >
      <div class="flex items-center justify-between pb-6 border-b border-border">
        <span class="font-display font-bold text-lg text-text">Menu</span>
        <button
          type="button"
          aria-label="Fermer le menu"
          class="inline-flex size-9 items-center justify-center rounded-[10px] hover:bg-surface-muted text-text-muted hover:text-text cursor-pointer"
          @click="close"
        >
          <Icon name="lucide:x" class="size-5" />
        </button>
      </div>

      <nav class="flex flex-col gap-2 pt-6">
        <NuxtLink
          to="/parcours"
          class="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-text hover:bg-surface-muted"
          @click="close"
        >
          <Icon name="lucide:layers" class="size-5 text-primary" />
          <span>Parcours</span>
        </NuxtLink>
        <NuxtLink
          to="/exercices"
          class="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-text hover:bg-surface-muted"
          @click="close"
        >
          <Icon name="lucide:code-xml" class="size-5 text-exercise" />
          <span>Bac à sable</span>
        </NuxtLink>
      </nav>

      <!-- Compte -->
      <div v-if="auth.loaded" class="border-border mt-auto flex flex-col gap-3 border-t pt-6">
        <template v-if="auth.account">
          <span class="text-ui text-text-muted flex items-center gap-2">
            <Icon name="lucide:circle-user" class="size-4 shrink-0" />
            <span class="truncate">{{ auth.account.email }}</span>
          </span>
          <UiButton variant="secondary" icon="lucide:log-out" @click="onLogout">
            Se déconnecter
          </UiButton>
        </template>
        <template v-else>
          <UiButton :to="`/connexion?redirect=${redirect}`" @click="close">
            Se connecter
          </UiButton>
          <UiButton
            variant="secondary"
            :to="`/inscription?redirect=${redirect}`"
            @click="close"
          >
            Créer un compte
          </UiButton>
        </template>
      </div>
    </div>
  </div>
</template>
