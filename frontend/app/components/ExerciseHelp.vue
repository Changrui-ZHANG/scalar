<script setup lang="ts">
/**
 * Aide propre a l'exercice courant : la lecon qui le precede dans son
 * chapitre et les indices de l'exercice. Jamais une aide d'une autre notion.
 * Les indices restent caches tant qu'on ne les demande pas.
 */
const props = defineProps<{ lesson: TrackEpisode | null; hints: readonly string[] }>()

const revealed = ref(0)
const hasHelp = computed(() => props.lesson !== null || props.hints.length > 0)
</script>

<template>
  <aside
    v-if="hasHelp"
    aria-labelledby="aide-titre"
    class="bg-lesson-soft border-lesson/20 grid content-start gap-4 rounded-2xl border p-6"
  >
    <div class="grid gap-1">
      <p class="eyebrow text-lesson">Notion associée</p>
      <h2 id="aide-titre" class="text-xl font-semibold">{{ lesson?.title ?? 'Aide' }}</h2>
      <p class="text-body-sm text-muted-foreground">
        Retrouvez uniquement ce dont vous avez besoin, sans quitter votre exercice.
      </p>
    </div>

    <div v-if="lesson" class="border-lesson/20 grid gap-2 border-t pt-4">
      <h3 class="font-semibold">Rappel</h3>
      <RichText :source="lesson.text" />
    </div>

    <div v-if="hints.length" class="border-lesson/20 grid gap-3 border-t pt-4">
      <div v-for="(hint, i) in hints.slice(0, revealed)" :key="i" class="grid gap-1">
        <h3 class="font-semibold">Indice {{ i + 1 }}</h3>
        <RichText :source="hint" />
      </div>
      <button
        v-if="revealed < hints.length"
        type="button"
        class="inline-flex min-h-11 items-center justify-self-start font-semibold underline"
        @click="revealed++"
      >
        {{ revealed === 0 ? 'Afficher un indice' : 'Afficher l’indice suivant' }}
        ({{ revealed + 1 }}/{{ hints.length }})
      </button>
    </div>

    <NuxtLink
      v-if="lesson"
      :to="lesson.route"
      class="inline-flex min-h-11 items-center justify-self-start underline"
    >
      Revoir la leçon associée <span aria-hidden="true">&nbsp;→</span>
    </NuxtLink>
  </aside>
</template>
