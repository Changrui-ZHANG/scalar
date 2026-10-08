<script setup lang="ts">
const store = useContentStore()
const language = useRouteLanguage()
const toast = useToast()

useSeoMeta({ title: `Nouveau chapitre ${language.label} — Backoffice Scalar` })

const back = `/langages/${language.id}`
const nextPosition = store.chaptersOf(language.id).length + 1
const EMPTY: ChapterInput = { title: '', slug: '', summary: '', status: 'draft' }

function onSaved(chapter: Chapter) {
  toast.add({ title: `Chapitre « ${chapter.title} » créé`, color: 'success' })
  return navigateTo(`${back}/chapitres/${chapter.id}`)
}
</script>

<template>
  <UDashboardPanel id="nouveau-chapitre">
    <template #header>
      <UDashboardNavbar :title="`Nouveau chapitre · ${language.label}`">
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
      <ChapterForm
        :initial="EMPTY"
        :save="(input) => store.createChapter(language.id, input)"
        submit-label="Créer le chapitre"
        :cancel-to="back"
        @saved="onSaved"
      >
        <template #note>
          <p class="text-muted text-sm">
            Ajouté en fin de parcours {{ language.label }}, en position {{ nextPosition }}.
          </p>
        </template>
      </ChapterForm>
    </template>
  </UDashboardPanel>
</template>
