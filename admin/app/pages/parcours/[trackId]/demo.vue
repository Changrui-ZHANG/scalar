<script setup lang="ts">
const store = useContentStore()
const track = await useRouteTrack()
const [first] = previewSteps(await store.loadOutline(track.id))

await navigateTo(
  first
    ? { path: previewPath(track.id, first), query: { demo: '1' } }
    : `/parcours/${track.id}/apercu`,
  { replace: true },
)
</script>

<template>
  <div />
</template>
