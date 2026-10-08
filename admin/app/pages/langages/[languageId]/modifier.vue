<script setup lang="ts">
const store = useContentStore()
const language = useRouteLanguage()
const toast = useToast()

useSeoMeta({ title: `Modifier ${language.label} — Backoffice Scalar` })

const back = `/langages/${language.id}`
const { id, position, ...initial } = language

function onSaved(saved: Language) {
  toast.add({ title: `Langage « ${saved.label} » enregistré`, color: 'success' })
  return navigateTo(back)
}
</script>

<template>
  <UDashboardPanel :id="`modifier-langage-${id}`">
    <template #header>
      <UDashboardNavbar :title="`Modifier · ${language.label}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour à ${language.label}`"
            :to="back"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <LanguageForm
        :initial="initial"
        :save="(input) => store.updateLanguage(id, input)"
        submit-label="Enregistrer"
        :cancel-to="back"
        editing
        @saved="onSaved"
      />
      <p class="text-muted text-sm">Position {{ position }} dans la liste des parcours.</p>
    </template>
  </UDashboardPanel>
</template>
