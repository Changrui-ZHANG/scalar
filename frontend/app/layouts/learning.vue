<script setup lang="ts">
import { computed } from 'vue'
import { exerciseKey, lessonKey } from '~/utils/track'
import { usePreferencesStore } from '~/stores/preferences'
import { usePlanDrawer } from '~/composables/usePlanDrawer'
import { useEpisodes } from '~/composables/useEpisodes'
import { useTrack } from '~/composables/useTrack'

const route = useRoute()
const preferences = usePreferencesStore()
const { open: drawerOpen } = usePlanDrawer()
const searchOpen = useState<boolean>('search-open', () => false)

function openSearch() {
  searchOpen.value = true
}

const { track } = await useTrack()

const displayedKey = computed(() => {
  const chapterSlug = String(route.params.chapter ?? route.params.chapitre ?? '')
  const lessonSlug = route.params.lesson ?? route.params.lecon
  const exerciseSlug = route.params.exercise ?? route.params.exercice

  if (lessonSlug) {
    return lessonKey(chapterSlug, String(lessonSlug))
  }
  if (exerciseSlug) {
    return exerciseKey(chapterSlug, String(exerciseSlug))
  }
  return null
})

const { episodes, progress, completed, displayed } = useEpisodes(track, displayedKey)
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-bg text-text">
    <a
      href="#contenu"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold"
    >
      Aller au contenu
    </a>

    <!-- En-tête desktop / tablette (masqué sur mobile) -->
    <div class="hidden md:block shrink-0">
      <LayoutHeader
        :track="track.track"
        :plan-toggle="true"
        @toggle-plan="drawerOpen = !drawerOpen"
        @open-search="openSearch"
      />
    </div>

    <!-- Barre mobile d'apprentissage (visible sous 768px) -->
    <LayoutLearningMobileBar
      v-if="displayed"
      :episode="displayed"
      :track-name="track.track.name"
      @toggle-plan="drawerOpen = !drawerOpen"
      @open-search="openSearch"
    />

    <!-- Corps de l'espace d'apprentissage -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Colonne / Tiroir Plan -->
      <LayoutDrawer
        v-model="drawerOpen"
        inline-from="xl"
        label="Plan du parcours"
      >
        <LayoutPlan
          :track="track"
          :episodes="episodes"
          :progress="progress"
          :completed="completed"
          :displayed-key="displayedKey"
          :collapsed="preferences.planCollapsed"
          @collapse="preferences.setPlanCollapsed(true)"
          @expand="preferences.setPlanCollapsed(false)"
          @navigate="drawerOpen = false"
        />
      </LayoutDrawer>

      <!-- Contenu de l'épisode -->
      <main id="contenu" class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>

    <LayoutSearchDialog />
  </div>
</template>
