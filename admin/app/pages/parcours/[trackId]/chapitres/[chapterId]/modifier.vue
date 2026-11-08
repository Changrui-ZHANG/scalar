<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
const toast = useToast()

useSeoMeta({ title: `Modifier ${chapter.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}/chapitres/${chapter.id}`
const initial: ChapterInput = {
  title: chapter.title,
  slug: chapter.slug,
  level: chapter.level,
  summary: chapter.summary,
  status: chapter.status,
}

function onSaved(saved: Chapter) {
  toast.add({ title: `Chapitre « ${saved.title} » enregistré`, color: 'success' })
  return navigateTo(back)
}
</script>

<template>
  <UDashboardPanel :id="`modifier-chapitre-${chapter.id}`">
    <template #header>
      <UDashboardNavbar :title="`Modifier · ${chapter.title}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour au chapitre ${chapter.title}`"
            :to="back"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ChapterForm
        :initial="initial"
        :save="(input) => store.updateChapter(track.id, chapter.id, input)"
        submit-label="Enregistrer"
        :cancel-to="back"
        editing
        @saved="onSaved"
      />
    </template>
  </UDashboardPanel>
</template>
