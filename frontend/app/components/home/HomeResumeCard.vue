<script setup lang="ts">
// Carte « Reprendre » de l'accueil habitué (specs-site.md § 4.2) :
// l'épisode suivant du parcours le plus récent, et les 4 épisodes d'après.
// Si tous les parcours sont terminés : un simple message, sans bouton.
import type { ResumeTarget } from '~/types/episode'

interface Props {
  target: ResumeTarget
}

const { target } = defineProps<Props>()
</script>

<template>
  <div
    v-if="target.kind === 'all_done'"
    class="rounded-panel border-border bg-surface flex items-center gap-4 border p-8"
  >
    <div class="bg-success-soft flex size-12 shrink-0 items-center justify-center rounded-full">
      <Icon name="lucide:circle-check" class="text-success size-6" />
    </div>
    <h2 class="font-display text-text text-2xl font-semibold">Tous les parcours sont terminés</h2>
  </div>

  <div
    v-else
    class="rounded-panel border-border bg-surface flex flex-col overflow-hidden border lg:flex-row"
  >
    <div class="flex flex-1 flex-col gap-4 p-6 md:p-8">
      <p class="flex flex-wrap items-baseline gap-2.5">
        <span class="font-display text-text text-lg font-semibold">{{
          target.card.view.track.name
        }}</span>
        <span class="text-label text-text-muted">
          · Chapitre {{ target.episode.chapter.number }}, {{ target.episode.chapter.title }}
        </span>
      </p>

      <div class="flex flex-col gap-1.5">
        <p
          v-if="target.episode.kind === 'exercise'"
          class="text-exercise flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase"
        >
          <Icon name="lucide:code-xml" class="size-4" />
          Exercice suivant
        </p>
        <p
          v-else
          class="text-primary flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase"
        >
          <Icon name="lucide:book-open" class="size-4" />
          Leçon suivante
        </p>

        <h2 class="font-display text-text md:text-title text-2xl font-semibold tracking-tight">
          {{ target.episode.title }}
        </h2>

        <p v-if="target.episode.excerpt" class="text-text-muted truncate text-base">
          {{ target.episode.excerpt }}
        </p>
      </div>

      <div class="flex max-w-105 flex-col gap-2">
        <UiProgressBar
          tall
          :value="target.card.progress.percent"
          :label="`Progression du parcours ${target.card.view.track.name}`"
        />
        <p class="text-small text-text-muted">
          {{ countLabel(target.card.progress.done, 'épisode', 'épisodes') }} sur
          {{ target.card.progress.total }} · {{ target.card.progress.percent }} %
        </p>
      </div>

      <div>
        <UiButton :to="target.episode.path" icon-right="lucide:arrow-right">
          <template v-if="target.kind === 'resume'">Reprendre</template>
          <template v-else>Commencer</template>
        </UiButton>
      </div>
    </div>

    <HomeUpNext v-if="target.upNext.length > 0" :episodes="target.upNext" />
  </div>
</template>
