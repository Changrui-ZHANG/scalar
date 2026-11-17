<script setup lang="ts">
const track = await useRouteTrack()
const { lesson, previous, next } = await useRoutePreviewLesson(track)

useSeoMeta({ title: `Tester ${lesson.title} — Backoffice Scalar` })

const crumbs = breadcrumb({
  track,
  extra: [{ label: 'Tester', to: `/parcours/${track.id}/apercu` }, { label: lesson.title }],
})

const base = `/parcours/${track.id}/apercu`
const demo = useRoute().query.demo === '1'
const query = demo ? { demo: '1' } : {}
const linkTo = (step: PreviewStep) => ({ path: previewPath(track.id, step), query })
const editUrl = {
  path: `/parcours/${track.id}/chapitres/${lesson.chapterId}/lecons/${lesson.id}`,
  query,
}
</script>

<template>
  <UDashboardPanel :id="`apercu-lecon-${lesson.id}`">
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
            :aria-label="`Retour à l’aperçu de ${track.name}`"
            :to="base"
          />
        </template>
        <template #right>
          <UBadge v-if="demo" color="primary" variant="subtle" label="Mode DEMO" />
          <StatusBadge v-if="lesson.status !== 'published'" :status="lesson.status" />
          <UButton
            icon="i-lucide-pencil"
            label="Modifier"
            color="neutral"
            variant="outline"
            :to="editUrl"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <article class="grid max-w-3xl gap-5">
        <header class="grid gap-1">
          <h1 class="text-xl font-semibold">{{ lesson.title }}</h1>
          <p class="text-muted">{{ lesson.summary }}</p>
        </header>

        <MarkdownPreview :source="lesson.body" />

        <nav class="flex justify-between gap-3">
          <UButton
            v-if="previous"
            icon="i-lucide-arrow-left"
            label="Précédent"
            color="neutral"
            variant="ghost"
            :to="linkTo(previous)"
          />
          <span v-else />
          <UButton
            v-if="next"
            trailing-icon="i-lucide-arrow-right"
            label="Suivant"
            color="neutral"
            variant="ghost"
            :to="linkTo(next)"
          />
          <UButton
            v-else-if="demo"
            trailing-icon="i-lucide-flag"
            label="Fin de la démo"
            color="neutral"
            variant="ghost"
            to="/parcours"
          />
        </nav>
      </article>
    </template>
  </UDashboardPanel>
</template>
