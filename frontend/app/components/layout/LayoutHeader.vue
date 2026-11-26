<script setup lang="ts">
import type { TrackRef } from '@scalar/shared/api'

interface Props {
  track?: TrackRef | null
  planToggle?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  togglePlan: []
  openSearch: []
}>()

const route = useRoute()
const mobileMenuOpen = ref(false)

const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <header class="border-border bg-surface sticky top-0 z-30 h-14 border-b px-4 md:h-15 md:px-6">
    <div class="flex h-full items-center justify-between gap-4">
      <!-- Gauche : bouton plan optionnel + Logo -->
      <div class="flex items-center gap-3">
        <button
          v-if="planToggle"
          type="button"
          aria-label="Afficher le plan du parcours"
          class="border-border bg-surface text-text hover:bg-surface-muted rounded-row inline-flex size-9 cursor-pointer items-center justify-center border xl:hidden"
          @click="emit('togglePlan')"
        >
          <Icon name="lucide:panel-left" class="size-5" />
        </button>

        <NuxtLink
          to="/"
          class="text-text flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <LayoutLogoMark variant="tablet" class="size-6.5" />
          <span class="font-display text-text text-xl font-semibold tracking-tight">Scalar</span>
        </NuxtLink>
      </div>

      <!-- Centre : nom du parcours (espace d'apprentissage uniquement) -->
      <div v-if="track" class="hidden items-center truncate md:flex">
        <NuxtLink
          :to="`/parcours/${track.slug}`"
          class="text-text hover:text-primary truncate text-sm font-semibold transition-colors"
        >
          {{ track.name }}
        </NuxtLink>
      </div>

      <!-- Droite : Recherche, Navigation, Compte, Thème, Menu mobile -->
      <div class="flex items-center gap-2 md:gap-4">
        <LayoutSearchButton @open-search="emit('openSearch')" />

        <!-- Navigation desktop -->
        <nav class="hidden items-center gap-6 md:flex">
          <NuxtLink
            to="/parcours"
            :aria-current="isActive('/parcours') ? 'page' : undefined"
            class="text-ui transition-colors"
            :class="
              isActive('/parcours')
                ? 'text-text font-semibold'
                : 'text-text-muted hover:text-text font-medium'
            "
          >
            Parcours
          </NuxtLink>
          <NuxtLink
            to="/exercices"
            :aria-current="isActive('/exercices') ? 'page' : undefined"
            class="text-ui transition-colors"
            :class="
              isActive('/exercices')
                ? 'text-text font-semibold'
                : 'text-text-muted hover:text-text font-medium'
            "
          >
            Bac à sable
          </NuxtLink>
        </nav>

        <LayoutAccount />

        <LayoutThemeToggle />

        <!-- Bouton menu burger sur mobile -->
        <button
          type="button"
          aria-label="Ouvrir le menu"
          class="text-text-muted hover:bg-surface-muted hover:text-text inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] md:hidden"
          @click="mobileMenuOpen = true"
        >
          <Icon name="lucide:menu" class="size-6" />
        </button>
      </div>
    </div>

    <!-- Feuille mobile -->
    <LayoutMobileMenu v-model="mobileMenuOpen" />
  </header>
</template>
