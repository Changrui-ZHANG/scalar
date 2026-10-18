<script setup lang="ts">
/**
 * Fin du questionnaire de positionnement, affichee a la place des questions :
 * niveau propose, detail des reponses et des tests unitaires, puis les cours
 * par lesquels commencer.
 */
import { computed } from 'vue'

const props = defineProps<{ evaluation: QuestionnaireEvaluation }>()
defineEmits<{ restart: [] }>()

const scores = computed(() => [
  { label: 'Score global', value: props.evaluation.score },
  { label: 'Exercices', value: props.evaluation.practical.score },
  { label: 'Auto-évaluation', value: props.evaluation.declared.score },
])

const LEVEL_STEPS = ['debutant', 'intermediaire', 'avance'] as const
const LEVEL_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }

/** Les résumés des cours portent du `code` en ligne, comme dans `RichText`. */
const inline = (text: string) => text.split('`').map((part, i) => ({ code: i % 2 === 1, text: part }))
</script>

<template>
  <div class="grid gap-8">
    <template v-if="evaluation">
      <!-- Niveau -->
      <section class="card grid gap-4 p-5 sm:p-6" aria-labelledby="niveau-propose">
        <p class="eyebrow">Résultat du questionnaire</p>
        <h2 id="niveau-propose" class="text-3xl font-semibold sm:text-4xl">
          Niveau proposé : {{ evaluation.level.label }}
        </h2>
        <p class="text-muted-foreground max-w-prose">{{ evaluation.level.description }}</p>

        <ol class="flex flex-wrap gap-2" aria-label="Niveaux">
          <li
            v-for="step in LEVEL_STEPS"
            :key="step"
            class="rounded-full border px-4 py-1 text-sm font-semibold"
            :class="step === evaluation.level.slug ? 'border-brand bg-brand/10' : 'text-muted-foreground'"
            :aria-current="step === evaluation.level.slug ? 'step' : undefined"
          >
            {{ LEVEL_LABELS[step] }}
          </li>
        </ol>

        <div class="flex flex-wrap gap-3">
          <NuxtLink :to="evaluation.recommendations.start.url" class="btn-primary">
            {{ evaluation.recommendations.start.label }}
          </NuxtLink>
          <button type="button" class="btn-secondary" @click="$emit('restart')">
            Refaire le questionnaire
          </button>
        </div>
      </section>

      <!-- Scores -->
      <section class="grid gap-4 sm:grid-cols-3" aria-label="Scores">
        <div v-for="s in scores" :key="s.label" class="card grid gap-2 p-5">
          <p class="text-body-sm text-muted-foreground">{{ s.label }}</p>
          <p class="text-3xl font-semibold tabular-nums">{{ s.value }} %</p>
          <div
            role="progressbar"
            :aria-valuenow="s.value"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`${s.label} : ${s.value} %`"
            class="bg-foreground/10 h-2 overflow-hidden rounded-full"
          >
            <div class="bg-brand h-full rounded-full" :style="{ width: `${s.value}%` }" />
          </div>
        </div>
      </section>
      <p class="text-body-sm text-muted-foreground -mt-4">
        Le score global pèse les exercices à 70 % et l'auto-évaluation à 30 %.
      </p>

      <!-- Observations -->
      <section v-if="evaluation.feedback.length" class="card grid gap-3 p-5 sm:p-6">
        <h3 class="text-title">Ce que nous retenons</h3>
        <ul class="grid list-disc gap-2 pl-5">
          <li v-for="(line, i) in evaluation.feedback" :key="i">{{ line }}</li>
        </ul>
      </section>

      <!-- Exercices -->
      <section class="grid gap-4">
        <h3 class="text-title">Exercices et tests unitaires</h3>
        <article
          v-for="exercise in evaluation.practical.exercises"
          :key="exercise.questionId"
          class="card grid gap-3 p-5"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h4 class="text-lg font-semibold">
              {{ exercise.title }}
              <span class="text-body-sm text-muted-foreground font-normal">· {{ exercise.difficulty }}</span>
            </h4>
            <span
              class="rounded-full px-3 py-0.5 text-sm font-semibold"
              :class="exercise.passed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'"
            >
              {{ exercise.passed ? '✓ Validé' : '× Non validé' }}
            </span>
          </div>
          <p class="text-body-sm text-muted-foreground">
            {{ exercise.passedCases }} test{{ exercise.passedCases > 1 ? 's' : '' }} réussi{{ exercise.passedCases > 1 ? 's' : '' }}
            sur {{ exercise.totalCases }}
          </p>
          <ul v-if="exercise.failures.length" class="grid gap-2 border-t pt-3">
            <li v-for="(failure, i) in exercise.failures" :key="i" class="flex gap-3">
              <span
                aria-hidden="true"
                class="bg-danger-soft text-danger grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold"
              >×</span>
              <span class="grid gap-0.5">
                <span><span class="sr-only">Échoué : </span>{{ failure.label }}</span>
                <span v-if="failure.detail" class="text-body-sm text-muted-foreground break-words">
                  {{ failure.detail }}
                </span>
              </span>
            </li>
          </ul>
        </article>
      </section>

      <!-- Reponses -->
      <section class="card grid gap-3 p-5 sm:p-6">
        <h3 class="text-title">Vos réponses</h3>
        <dl class="grid gap-3">
          <div v-for="(item, i) in evaluation.declared.answers" :key="i" class="grid gap-0.5">
            <dt class="text-body-sm text-muted-foreground">{{ item.question }}</dt>
            <dd class="font-medium break-words">{{ item.answer }}</dd>
          </div>
        </dl>
      </section>

      <!-- Cours recommandes -->
      <section class="grid gap-4">
        <div class="grid gap-1">
          <h3 class="text-title">Cours recommandés</h3>
          <p class="text-muted-foreground">
            Parcours {{ evaluation.recommendations.language.label }}, à partir de votre niveau.
          </p>
        </div>
        <p v-if="!evaluation.recommendations.lessons.length" class="text-muted-foreground">
          Aucun cours à recommander pour l'instant.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li v-for="lesson in evaluation.recommendations.lessons" :key="lesson.slug">
            <NuxtLink
              :to="lesson.url"
              class="card hover:border-brand grid h-full gap-2 p-5 transition-colors"
            >
              <span class="text-body-sm text-muted-foreground">{{ lesson.category }}</span>
              <span class="text-lg font-semibold">{{ lesson.title }}</span>
              <span v-if="lesson.summary" class="text-muted-foreground">
                <RichInline :parts="inline(lesson.summary)" />
              </span>
              <span class="text-body-sm">{{ lesson.reason }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
