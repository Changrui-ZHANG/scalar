<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const [first] = (await store.loadOutline(track.id)).flatMap(({ exercises }) => exercises)

await navigateTo(
  first
    ? { path: `/parcours/${track.id}/apercu/exercices/${first.id}`, query: { demo: '1' } }
    : `/parcours/${track.id}/apercu`,
  { replace: true },
)
</script>

<template>
  <div />
</template>
