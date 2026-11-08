<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Connexion — Backoffice Scalar' })

const route = useRoute()
const auth = useAuthStore()
const state = reactive<LoginInput>({ email: '', password: '' })
const error = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<LoginInput>) {
  error.value = null
  const result = await auth.login(event.data)
  if (!result.ok) {
    error.value = result.message
    return
  }
  if (result.data.role !== 'admin') {
    error.value = 'Ce compte n’a pas accès au backoffice.'
    return
  }
  return navigateTo(safeRedirect(route.query.redirect))
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="font-semibold">Scalar · Backoffice</h1>
      </template>

      <UForm :schema="loginInputSchema" :state="state" class="grid gap-4" @submit="onSubmit">
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" type="email" autocomplete="username" class="w-full" />
        </UFormField>
        <UFormField label="Mot de passe" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>
        <UAlert v-if="error" :title="error" color="error" variant="subtle" />
        <UButton type="submit" label="Se connecter" block />
      </UForm>
    </UCard>
  </main>
</template>
