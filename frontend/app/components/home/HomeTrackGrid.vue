<script setup lang="ts">
import type { TrackCard } from '~/types/episode'

interface Props {
  cards: readonly TrackCard[]
}

defineProps<Props>()

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

function getTone(status: string): 'primary' | 'muted' | 'success' {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'primary'
  return 'muted'
}

function getStatusLabel(status: string): string {
  if (status === 'completed') return 'Terminé'
  if (status === 'in_progress') return 'En cours'
  return 'À commencer'
}
</script>

<template>
  <div class="mb-10 flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-2xl font-bold text-text">
        Vos parcours
      </h2>
      <NuxtLink
        to="/parcours"
        class="text-sm font-semibold text-primary hover:underline"
      >
        Tous les parcours →
      </NuxtLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="c in cards"
        :key="c.view.track.slug"
        :to="`/parcours/${c.view.track.slug}`"
        class="group flex flex-col justify-between rounded-[14px] border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-sm"
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <!-- Initiales du nom sur primary-soft -->
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft font-display text-base font-bold text-primary">
              {{ getInitials(c.view.track.name) }}
            </span>

            <UiTag :tone="getTone(c.progress.status)">
              {{ getStatusLabel(c.progress.status) }}
            </UiTag>
          </div>

          <div class="flex flex-col gap-1">
            <h3 class="font-display text-xl font-bold text-text group-hover:text-primary transition-colors">
              {{ c.view.track.name }}
            </h3>
            <span class="text-xs text-text-muted">
              {{ c.view.chapters.length }} chapitres · {{ c.progress.total }} épisodes
            </span>
          </div>

          <!-- Prérequis si conseillé -->
          <div v-if="c.prerequisite" class="text-xs text-text-muted italic">
            Conseillé après {{ c.prerequisite.name }}
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-1.5">
          <UiProgressBar
            :value="c.progress.percent"
            :label="`Progression ${c.view.track.name}`"
          />
          <span class="text-xs text-text-muted font-medium">
            {{ c.progress.percent }} % terminé
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
