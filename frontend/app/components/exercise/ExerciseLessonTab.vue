<script setup lang="ts">
import type { LessonDetail } from '@scalar/shared/api'
import type { ProgrammingLanguage } from '@scalar/shared/enums'

interface Props {
  lessons: readonly LessonDetail[] | null
  status: 'idle' | 'pending' | 'ready' | 'error'
  language: ProgrammingLanguage | null
}

defineProps<Props>()

const emit = defineEmits<{
  try: [code: string, language: ProgrammingLanguage]
  retry: []
}>()
</script>

<template>
  <div class="flex flex-col gap-6 py-2">
    <!-- En cours de chargement -->
    <div v-if="status === 'pending'" class="flex flex-col gap-3 p-4">
      <span class="text-xs text-text-muted">Chargement de la leçon…</span>
      <UiSkeleton :lines="3" />
    </div>

    <!-- Erreur de chargement -->
    <div v-else-if="status === 'error'" class="flex flex-col items-center gap-3 p-6 text-center">
      <Icon name="lucide:alert-circle" class="size-6 text-danger" />
      <p class="text-xs text-text">Impossible de charger le rappel de leçon.</p>
      <button
        type="button"
        class="text-xs font-semibold text-primary underline cursor-pointer"
        @click="emit('retry')"
      >
        Réessayer
      </button>
    </div>

    <!-- Aucune leçon disponible -->
    <div v-else-if="!lessons || lessons.length === 0" class="p-6 text-center text-xs text-text-muted">
      Ce chapitre ne contient pas de leçon associée.
    </div>

    <!-- Liste des leçons du chapitre -->
    <div v-else class="flex flex-col gap-8">
      <article
        v-for="lesson in lessons"
        :key="lesson.slug"
        class="flex flex-col gap-3 border-b border-border pb-6 last:border-b-0"
      >
        <div class="flex items-center justify-between gap-4">
          <h3 class="font-display text-lg font-bold text-text">
            {{ lesson.title }}
          </h3>
          <NuxtLink
            :to="`/parcours/${lesson.track.slug}/${lesson.chapter.slug}/lecon/${lesson.slug}`"
            target="_blank"
            class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Pleine page</span>
            <Icon name="lucide:external-link" class="size-3" />
          </NuxtLink>
        </div>

        <div class="prose max-w-none text-xs leading-relaxed text-text">
          <ContentRichText
            :source="lesson.body"
            :language="language"
            :tryable="true"
            variant="compact"
            @try="(code, lang) => emit('try', code, lang)"
          />
        </div>
      </article>
    </div>
  </div>
</template>
