<script setup lang="ts">
import { useSandbox } from '~/composables/useSandbox'
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Bac à sable'],
  description: 'Écrivez un script JavaScript ou TypeScript, exécutez-le et observez sa sortie standard.',
  type: 'website',
})

const {
  language,
  code,
  pending,
  result,
  error,
  seed,
  acceptSeed,
  dismissSeed,
  run,
} = useSandbox()
</script>

<template>
  <div class="mx-auto max-w-280 px-4 md:px-6 py-8 md:py-12 flex flex-col gap-8">
    <SandboxHeader />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Éditeur (7 colonnes) -->
      <div class="lg:col-span-7">
        <SandboxEditor
          v-model:code="code"
          v-model:language="language"
          :pending="pending"
          :error="error"
          @run="run"
        />
      </div>

      <!-- Panneau de sortie (5 colonnes) -->
      <div class="lg:col-span-5">
        <SandboxOutput
          :result="result"
          :pending="pending"
        />
      </div>
    </div>

    <!-- Dialogue de remplacement -->
    <SandboxReplaceDialog
      :open="seed !== null"
      @accept="acceptSeed"
      @dismiss="dismissSeed"
    />
  </div>
</template>
