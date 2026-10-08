<script setup lang="ts">
useSeoMeta({ title: 'Nouveau langage — Backoffice Scalar' })

const store = useContentStore()
const toast = useToast()

const EMPTY: LanguageInput = { label: '', slug: '', summary: '', runtime: 'node', status: 'draft' }

function onSaved(language: Language) {
  toast.add({ title: `Langage « ${language.label} » créé`, color: 'success' })
  return navigateTo(`/langages/${language.id}`)
}
</script>

<template>
  <UDashboardPanel id="nouveau-langage">
    <template #header>
      <UDashboardNavbar title="Nouveau langage">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="'Retour aux langages'"
            :to="'/langages'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <LanguageForm
        :initial="EMPTY"
        :save="store.createLanguage"
        submit-label="Créer le langage"
        cancel-to="/langages"
        @saved="onSaved"
      />
    </template>
  </UDashboardPanel>
</template>
