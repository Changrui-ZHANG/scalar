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
  <header class="sticky top-0 z-30 h-14 md:h-[60px] border-b border-border bg-surface px-4 md:px-6">
    <div class="mx-auto flex h-full items-center justify-between gap-4 max-w-280">
      <!-- Gauche : bouton plan optionnel + Logo -->
      <div class="flex items-center gap-3">
        <button
          v-if="planToggle"
          type="button"
          aria-label="Afficher le plan du parcours"
          class="inline-flex size-9 items-center justify-center rounded-[10px] border border-border bg-surface text-text hover:bg-surface-muted cursor-pointer"
          @click="emit('togglePlan')"
        >
          <Icon name="lucide:panel-left" class="size-5" />
        </button>

        <NuxtLink to="/" class="flex items-center gap-2.5 text-text hover:opacity-90 transition-opacity">
          <!-- Symbole tablette 26px -->
          <img src="/logo-tablet.svg" alt="" width="26" height="26" class="size-[26px] text-primary">
          <span class="font-display font-semibold text-xl tracking-tight text-text">Scalar</span>
        </NuxtLink>
      </div>

      <!-- Centre : nom du parcours (espace d'apprentissage uniquement) -->
      <div v-if="track" class="hidden md:flex items-center truncate">
        <NuxtLink
          :to="`/parcours/${track.slug}`"
          class="text-sm font-semibold text-text hover:text-primary transition-colors truncate"
        >
          {{ track.name }}
        </NuxtLink>
      </div>

      <!-- Droite : Recherche, Navigation, Thème, Menu mobile -->
      <div class="flex items-center gap-2 md:gap-4">
        <LayoutSearchButton @open-search="emit('openSearch')" />

        <!-- Navigation desktop -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink
            to="/parcours"
            :aria-current="isActive('/parcours') ? 'page' : undefined"
            class="text-[14.5px] transition-colors"
            :class="isActive('/parcours') ? 'font-semibold text-text' : 'font-medium text-text-muted hover:text-text'"
          >
            Parcours
          </NuxtLink>
          <NuxtLink
            to="/exercices"
            :aria-current="isActive('/exercices') ? 'page' : undefined"
            class="text-[14.5px] transition-colors"
            :class="isActive('/exercices') ? 'font-semibold text-text' : 'font-medium text-text-muted hover:text-text'"
          >
            Bac à sable
          </NuxtLink>
        </nav>

        <LayoutThemeToggle />

        <!-- Bouton menu burger sur mobile -->
        <button
          type="button"
          aria-label="Ouvrir le menu"
          class="md:hidden inline-flex size-11 items-center justify-center rounded-[10px] text-text-muted hover:bg-surface-muted hover:text-text cursor-pointer"
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
