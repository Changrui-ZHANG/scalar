<script setup lang="ts">
import { useSessionStore } from '~/stores/session'

const session = useSessionStore()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b">
      <nav class="max-w-content mx-auto flex items-center justify-between p-4">
        <NuxtLink to="/" class="font-display text-title">Scalar</NuxtLink>
        <NuxtLink
          v-if="!session.compte"
          to="/inscription"
          class="text-body-sm text-primary underline-offset-4 hover:underline"
        >
          Créer un compte
        </NuxtLink>
        <NuxtLink
          v-else
          to="/tableau-de-bord"
          class="text-body-sm text-primary underline-offset-4 hover:underline"
        >
          Tableau de bord
        </NuxtLink>
      </nav>
    </header>

    <!-- Sous l'en-tête et dans le flux, jamais superposé au contenu : c'est ce
         qui garantit qu'il n'occulte pas un élément qui vient de recevoir le
         focus. Un seul bandeau existe dans tout le produit, et il est ici —
         d'où l'impossibilité d'en empiler deux. -->
    <BandeauCompte />

    <main class="max-w-content mx-auto w-full flex-1 p-4">
      <slot />
    </main>

    <footer class="border-t">
      <div class="max-w-content text-body-sm text-muted-foreground mx-auto p-4">Scalar</div>
    </footer>
  </div>
</template>
