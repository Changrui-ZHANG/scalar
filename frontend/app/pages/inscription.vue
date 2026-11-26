<script setup lang="ts">
// Création d'un compte apprenant. Le backend ouvre aussitôt la session.
import type { Credentials } from '~/types/account'
import { usePageSeo } from '~/composables/usePageSeo'
import { useAuthStore } from '~/stores/auth'
import { apiErrorMessage, safeRedirect } from '~/utils/apiError'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Créer un compte'],
  description: 'Créez votre compte Scalar pour garder votre progression sur tous vos appareils.',
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
    await auth.register(credentials)
    await navigateTo(redirect.value)
  } catch (err) {
    error.value = apiErrorMessage(err, 'La création du compte a échoué. Réessayez.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex justify-center px-4 py-16 md:py-24">
    <div class="flex w-full max-w-sm flex-col gap-8">
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-title text-text font-semibold">Créer un compte</h1>
        <p class="text-body text-text-muted">
          Gardez votre progression sur tous vos appareils et passez à Premium quand vous voulez.
        </p>
      </div>

      <AccountForm mode="register" :error="error" :loading="loading" @submit="onSubmit" />

      <p class="text-ui text-text-muted">
        Déjà un compte ?
        <NuxtLink
          :to="{ path: '/connexion', query: route.query }"
          class="text-primary font-semibold hover:underline"
        >
          Se connecter
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
