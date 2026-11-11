<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const outline = await store.loadOutline(track.id)

useSeoMeta({ title: `Tester ${track.name} — Backoffice Scalar` })

const back = `/parcours/${track.id}`
</script>

<template>
  <UDashboardPanel :id="`apercu-${track.id}`">
    <template #header>
      <UDashboardNavbar :title="`Tester · ${track.name}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :aria-label="`Retour au parcours ${track.name}`"
            :to="back"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-muted">
        Le parcours tel que l’apprenant le suivra, brouillons compris. Rien n’est enregistré.
      </p>
      <p v-if="outline.length === 0" class="text-muted">Aucun chapitre dans ce parcours.</p>
      <section v-for="{ chapter, exercises } in outline" :key="chapter.id" class="grid gap-2">
        <div class="flex items-center gap-3">
          <h2 class="font-medium">{{ chapter.title }}</h2>
          <StatusBadge v-if="chapter.status !== 'published'" :status="chapter.status" />
        </div>
        <p v-if="exercises.length === 0" class="text-muted text-sm">Aucun exercice.</p>
        <ul v-else class="grid gap-1">
          <li v-for="exercise in exercises" :key="exercise.id" class="flex items-center gap-3">
            <ULink :to="`/parcours/${track.id}/apercu/exercices/${exercise.id}`">
              {{ exercise.title }}
            </ULink>
            <StatusBadge v-if="exercise.status !== 'published'" :status="exercise.status" />
          </li>
        </ul>
      </section>
    </template>
  </UDashboardPanel>
</template>
