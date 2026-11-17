<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const chapter = await useRouteChapter(track)
const lesson = await useRouteLesson(chapter)
const toast = useToast()

useSeoMeta({ title: `Modifier ${lesson.title} — Backoffice Scalar` })

const back = `/parcours/${track.id}/chapitres/${chapter.id}`

const crumbs = breadcrumb({
  track,
  chapter,
  extra: [{ label: lesson.title, to: `${back}/lecons/${lesson.id}` }],
})
const demoUrl =
  useRoute().query.demo === '1'
    ? { path: `/parcours/${track.id}/apercu/lecons/${lesson.id}`, query: { demo: '1' } }
    : null

function onSaved(saved: Lesson) {
  toast.add({ title: `Leçon « ${saved.title} » enregistrée`, color: 'success' })
  return navigateTo(demoUrl ?? back)
}
</script>

<template>
  <UDashboardPanel :id="`lecon-${lesson.id}`">
    <template #header>
      <UDashboardNavbar>
        <template #title>
          <AdminBreadcrumb :items="crumbs" />
        </template>
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour au chapitre ${chapter.title}`"
            :to="back"
          />
        </template>
        <template v-if="demoUrl" #right>
          <UButton
            icon="i-lucide-undo-2"
            label="Retour à la démo"
            color="neutral"
            variant="outline"
            :to="demoUrl"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <LessonForm
        :initial="toLessonInput(lesson)"
        :save="(input) => store.updateLesson(lesson.id, input)"
        submit-label="Enregistrer"
        :cancel-to="back"
        editing
        @saved="onSaved"
      >
        <template #note>
          <p class="text-muted text-sm">
            Une leçon publiée reste modifiable. Changer le cours met à jour sa date de relecture.
          </p>
        </template>
      </LessonForm>
    </template>
  </UDashboardPanel>
</template>
