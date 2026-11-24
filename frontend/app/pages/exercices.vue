<script setup lang="ts">
import { useSandbox } from '~/composables/useSandbox'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Bac à sable'],
  description:
    'Écrivez un script JavaScript ou TypeScript, exécutez-le et observez sa sortie standard.',
  type: 'website',
})

const { language, code, pending, result, error, seed, acceptSeed, dismissSeed, run } = useSandbox()
</script>

<template>
  <div class="flex flex-col gap-4.5 px-4 py-6 md:px-8 md:py-7">
    <SandboxHeader v-model:language="language" />

    <div class="flex flex-col gap-4.5 md:flex-row">
      <SandboxEditor
        v-model:code="code"
        :language="language"
        :pending="pending"
        :error="error"
        @run="run"
      />
      <!-- Mobile : Exécuter pleine largeur entre l'éditeur et la sortie (specs-site.md § 8) -->
      <UiButton
        class="md:hidden"
        icon="lucide:play"
        :disabled="pending"
        :loading="pending"
        loading-label="Exécution…"
        @click="run"
      >
        Exécuter
      </UiButton>
      <SandboxOutput :result="result" :pending="pending" />
    </div>

    <SandboxReplaceDialog :open="seed !== null" @accept="acceptSeed" @dismiss="dismissSeed" />
  </div>
</template>
