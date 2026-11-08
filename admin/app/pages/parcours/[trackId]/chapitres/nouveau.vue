<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const toast = useToast()

useSeoMeta({ title: `Nouveau chapitre ${track.name} — Backoffice Scalar` })

const back = `/parcours/${track.id}`
const EMPTY: ChapterInput = {
  title: '',
  slug: '',
  level: 'beginner',
  summary: '',
  status: 'draft',
}

function onSaved(chapter: Chapter) {
  toast.add({ title: `Chapitre « ${chapter.title} » créé`, color: 'success' })
  return navigateTo(`${back}/chapitres/${chapter.id}`)
}
</script>

<template>
  <UDashboardPanel id="nouveau-chapitre">
    <template #header>
      <UDashboardNavbar :title="`Nouveau chapitre · ${track.name}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour à ${track.name}`"
            :to="back"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ChapterForm
        :initial="EMPTY"
        :save="(input) => store.createChapter(track.id, input)"
        submit-label="Créer le chapitre"
        :cancel-to="back"
        @saved="onSaved"
      >
        <template #note>
          <p class="text-muted text-sm">
            Créé en brouillon, à la fin du niveau choisi dans le parcours {{ track.name }}.
          </p>
        </template>
      </ChapterForm>
    </template>
  </UDashboardPanel>
</template>
