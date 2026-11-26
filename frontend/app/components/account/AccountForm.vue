<script setup lang="ts">
// Formulaire de connexion et d'inscription : email, mot de passe, erreur, bouton.
// La page décide quoi faire de la soumission (se connecter ou créer le compte).
import type { Credentials } from '~/types/account'

interface Props {
  mode: 'login' | 'register'
  error: string | null
  loading: boolean
}

const { mode, error, loading } = defineProps<Props>()

const emit = defineEmits<{
  submit: [credentials: Credentials]
}>()

const email = ref('')
const password = ref('')

const submitLabel = computed(() => (mode === 'login' ? 'Se connecter' : 'Créer mon compte'))

function onSubmit() {
  emit('submit', { email: email.value, password: password.value })
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
    <label class="flex flex-col gap-1.5">
      <span class="text-ui text-text font-semibold">Adresse email</span>
      <input
        v-model="email"
        type="email"
        name="email"
        autocomplete="email"
        required
        class="rounded-control border-border bg-surface text-text focus:border-primary h-11 border px-3.5 outline-none"
      >
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-ui text-text font-semibold">Mot de passe</span>
      <input
        v-model="password"
        type="password"
        name="password"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        required
        :aria-describedby="mode === 'register' ? 'password-rule' : undefined"
        class="rounded-control border-border bg-surface text-text focus:border-primary h-11 border px-3.5 outline-none"
      >
      <span v-if="mode === 'register'" id="password-rule" class="text-small text-text-muted">
        8 caractères au moins.
      </span>
    </label>

    <p
      v-if="error"
      role="alert"
      class="bg-danger-soft text-danger text-small rounded-row px-3.5 py-2.5 font-medium"
    >
      {{ error }}
    </p>

    <UiButton type="submit" :loading="loading" loading-label="Un instant…">
      {{ submitLabel }}
    </UiButton>
  </form>
</template>
