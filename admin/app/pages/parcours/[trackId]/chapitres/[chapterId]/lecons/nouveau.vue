<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
const toast = useToast()

useSeoMeta({ title: `Nouvelle leçon · ${chapter.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}/chapitres/${chapter.id}`
const EMPTY: LessonInput = { title: '', slug: '', summary: '', body: '', status: 'draft' }

function onSaved(lesson: Lesson) {
  toast.add({ title: `Leçon « ${lesson.title} » créée`, color: 'success' })
  return navigateTo(back)
}
</script>

<template>
  <UDashboardPanel id="nouvelle-lecon">
    <template #header>
      <UDashboardNavbar :title="`Nouvelle leçon · ${chapter.title}`">
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
      <LessonForm
        :initial="EMPTY"
        :save="(input) => store.createLesson(chapter.id, input)"
        submit-label="Créer la leçon"
        :cancel-to="back"
        @saved="onSaved"
      >
        <template #note>
          <p class="text-muted text-sm">
            Créée en brouillon, à la fin du chapitre « {{ chapter.title }} ». Vous pourrez ensuite
            la publier.
          </p>
        </template>
      </LessonForm>
    </template>
  </UDashboardPanel>
</template>
