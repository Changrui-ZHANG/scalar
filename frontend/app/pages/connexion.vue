<script setup lang="ts">
// Connexion d'un apprenant. Après succès : retour à la page d'où il venait (?redirect=).
import type { Credentials } from '~/types/account'
import { usePageSeo } from '~/composables/usePageSeo'
import { useAuthStore } from '~/stores/auth'
import { apiErrorMessage, safeRedirect } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Connexion'],
  description: 'Connectez-vous à votre compte Scalar pour retrouver votre progression.',
  type: 'website',
})

const route = useRoute()
const auth = useAuthStore()
const error = ref<string | null>(null)
const loading = ref(false)

const redirect = computed(() => safeRedirect(route.query.redirect))

async function onSubmit(credentials: Credentials) {
  error.value = null
  loading.value = true
  try {
    await auth.login(credentials)
    await navigateTo(redirect.value)
  } catch (err) {
    error.value = apiErrorMessage(err, 'La connexion a échoué. Réessayez.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex justify-center px-4 py-16 md:py-24">
    <div class="flex w-full max-w-sm flex-col gap-8">
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-title text-text font-semibold">Connexion</h1>
        <p class="text-body text-text-muted">Retrouvez votre progression et vos chapitres Premium.</p>
      </div>

      <AccountForm mode="login" :error="error" :loading="loading" @submit="onSubmit" />

      <p class="text-ui text-text-muted">
        Pas encore de compte ?
        <NuxtLink
          :to="{ path: '/inscription', query: route.query }"
          class="text-primary font-semibold hover:underline"
        >
          Créer un compte
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
