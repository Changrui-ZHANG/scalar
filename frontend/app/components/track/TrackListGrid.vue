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

function getCountersLabel(card: TrackCard): string {
  const chapters = card.view.chapters.length
  let lessons = 0
  let exercises = 0
  for (const ch of card.view.chapters) {
    lessons += ch.lessons.length
    exercises += ch.exercises.length
  }

  const parts = [`${chapters} chapitres`, `${lessons} leçons`]
  if (card.view.track.programmingLanguage && exercises > 0) {
    parts.push(`${exercises} exercices`)
  }
  return parts.join(' · ')
}

function getLanguageTag(card: TrackCard): { text: string; tone: 'primary' | 'muted' } {
  if (card.view.track.programmingLanguage === 'javascript') {
    return { text: 'JavaScript', tone: 'primary' }
  }
  if (card.view.track.programmingLanguage === 'typescript') {
    return { text: 'TypeScript', tone: 'primary' }
  }
  return { text: 'Leçons seulement', tone: 'muted' }
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
    <div
      v-for="c in cards"
      :key="c.view.track.slug"
      class="group relative flex flex-col justify-between rounded-[14px] border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-sm"
    >
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft font-display text-lg font-bold text-primary">
            {{ getInitials(c.view.track.name) }}
          </span>

          <UiTag :tone="getLanguageTag(c).tone">
            {{ getLanguageTag(c).text }}
          </UiTag>
        </div>

        <div class="flex flex-col gap-1.5">
          <NuxtLink
            :to="`/parcours/${c.view.track.slug}`"
            class="font-display text-xl font-bold text-text group-hover:text-primary transition-colors after:absolute after:inset-0 after:z-0"
          >
            {{ c.view.track.name }}
          </NuxtLink>
          <p class="text-sm text-text-muted leading-relaxed line-clamp-2">
            {{ c.view.track.summary }}
          </p>
        </div>

        <span class="text-xs text-text-muted">
          {{ getCountersLabel(c) }}
        </span>

        <div v-if="c.prerequisite" class="text-xs text-text-muted italic">
          Conseillé après {{ c.prerequisite.name }}
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-3 relative z-10">
        <div class="flex flex-col gap-1.5">
          <UiProgressBar
            :value="c.progress.percent"
            :label="`Progression ${c.view.track.name}`"
          />
          <span class="text-xs text-text-muted">
            {{ c.progress.percent }} % terminé
          </span>
        </div>

        <div>
          <UiButton
            v-if="c.progress.status === 'in_progress'"
            :to="c.progress.current?.path ?? `/parcours/${c.view.track.slug}`"
            variant="primary"
            dense
            icon="lucide:arrow-right"
          >
            Reprendre
          </UiButton>
          <UiButton
            v-else
            :to="c.progress.current?.path ?? `/parcours/${c.view.track.slug}`"
            variant="secondary"
            dense
            icon="lucide:play"
          >
            Commencer
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
