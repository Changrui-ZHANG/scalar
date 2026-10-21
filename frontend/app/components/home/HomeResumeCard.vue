<script setup lang="ts">
import type { ResumeTarget } from '~/types/episode'

interface Props {
  target: ResumeTarget
}

defineProps<Props>()
</script>

<template>
  <div class="mb-10 w-full rounded-[14px] border border-border bg-surface p-6 md:p-8">
    <!-- Cas 1 : Tous les parcours sont terminés -->
    <div v-if="target.kind === 'all_done'" class="flex items-center gap-4 py-4 text-center">
      <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
        <Icon name="lucide:circle-check" class="size-6" />
      </div>
      <div class="flex flex-col text-left">
        <h2 class="font-display text-xl font-bold text-text">
          Tous les parcours sont terminés
        </h2>
        <p class="text-sm text-text-muted">
          Félicitations ! Vous pouvez explorer le bac à sable ou revoir vos notions.
        </p>
      </div>
    </div>

    <!-- Cas 2 : Reprendre ou Commencer -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Colonne principale : épisode cible -->
      <div class="flex flex-col justify-between gap-6 lg:col-span-7">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <UiTag :tone="target.episode.kind === 'lesson' ? 'primary' : 'exercise'">
              {{ target.episode.kind === 'lesson' ? 'Leçon suivante' : 'Exercice suivant' }}
            </UiTag>
            <span class="text-xs text-text-muted font-medium">
              {{ target.card.view.track.name }} · ch. {{ target.episode.chapter.number }} {{ target.episode.chapter.title }}
            </span>
          </div>

          <h2 class="font-display text-2xl md:text-3xl font-bold text-text">
            {{ target.episode.title }}
          </h2>

          <p v-if="target.episode.excerpt" class="text-sm text-text-muted truncate">
            {{ target.episode.excerpt }}
          </p>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <UiProgressBar
              :value="target.card.progress.percent"
              :label="`Progression ${target.card.view.track.name}`"
            />
            <span class="text-xs text-text-muted">
              {{ target.card.progress.percent }} % terminé
            </span>
          </div>

          <div>
            <UiButton
              :to="target.episode.path"
              variant="primary"
              :icon="target.kind === 'resume' ? 'lucide:arrow-right' : 'lucide:play'"
            >
              {{ target.kind === 'resume' ? 'Reprendre' : 'Commencer' }}
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Colonne droite : ensuite dans le parcours -->
      <div class="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0 lg:col-span-5">
        <HomeUpNext :episodes="target.upNext" />
      </div>
    </div>
  </div>
</template>
