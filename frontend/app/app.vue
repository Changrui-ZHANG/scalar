<script setup lang="ts">
import { THEME_INIT_SCRIPT } from '~/composables/useTheme'
import { useDraftsStore } from '~/stores/drafts'
import { usePreferencesStore } from '~/stores/preferences'
import { useProgressStore } from '~/stores/progress'

useHead({
  script: [
    {
      innerHTML: THEME_INIT_SCRIPT,
      type: 'text/javascript',
    },
  ],
})

// Données structurées communes à tout le site (specs-site.md § 13).
useSchemaOrg([
  defineWebSite({ name: 'Scalar' }),
  defineOrganization({ name: 'Scalar', logo: '/logo.svg' }),
])

// La progression, les brouillons et les préférences vivent dans le navigateur.
// On les lit une fois la page montée : le serveur ne les connaît pas, et lire
// plus tôt ferait différer le rendu du navigateur de celui du serveur.
const progressStore = useProgressStore()
const draftsStore = useDraftsStore()
const preferencesStore = usePreferencesStore()

onMounted(() => {
  progressStore.loadFromStorage()
  draftsStore.loadFromStorage()
  preferencesStore.loadFromStorage()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
