<script setup lang="ts">
import { THEME_INIT_SCRIPT } from '~/composables/useTheme'

useHead({
  script: [
    {
      innerHTML: THEME_INIT_SCRIPT,
      type: 'text/javascript',
    },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
