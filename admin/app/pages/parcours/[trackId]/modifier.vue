<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const toast = useToast()

useSeoMeta({ title: `Modifier ${track.name} — Backoffice Scalar` })

const crumbs = breadcrumb({
  track,
  extra: [{ label: 'Modifier', to: `/parcours/${track.id}/modifier` }],
})

const back = `/parcours/${track.id}`
const initial: TrackInput = {
  name: track.name,
  slug: track.slug,
  summary: track.summary,
  programmingLanguage: track.programmingLanguage,
  status: track.status,
}

function onSaved(saved: Track) {
  toast.add({ title: `Parcours « ${saved.name} » enregistré`, color: 'success' })
  return navigateTo(back)
}
</script>

<template>
  <UDashboardPanel :id="`modifier-parcours-${track.id}`">
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
            :aria-label="`Retour à ${track.name}`"
            :to="back"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TrackForm
        :initial="initial"
        :save="(input) => store.updateTrack(track.id, input)"
        submit-label="Enregistrer"
        :cancel-to="back"
        editing
        @saved="onSaved"
      />
      <p class="text-muted text-sm">Position {{ track.position }} dans la liste des parcours.</p>
    </template>
  </UDashboardPanel>
</template>
