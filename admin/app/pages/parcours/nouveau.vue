<script setup lang="ts">
useSeoMeta({ title: 'Nouveau parcours — Backoffice Scalar' })

const store = useContentStore()
const toast = useToast()

const EMPTY: TrackInput = {
  name: '',
  slug: '',
  summary: '',
  programmingLanguage: 'javascript',
  status: 'draft',
}

function onSaved(track: Track) {
  toast.add({ title: `Parcours « ${track.name} » créé`, color: 'success' })
  return navigateTo(`/parcours/${track.id}`)
}
</script>

<template>
  <UDashboardPanel id="nouveau-parcours">
    <template #header>
      <UDashboardNavbar title="Nouveau parcours">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Retour aux parcours"
            to="/parcours"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TrackForm
        :initial="EMPTY"
        :save="store.createTrack"
        submit-label="Créer le parcours"
        cancel-to="/parcours"
        @saved="onSaved"
      />
    </template>
  </UDashboardPanel>
</template>
