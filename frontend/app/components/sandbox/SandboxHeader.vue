<script setup lang="ts">
// En-tête du bac à sable (specs-site.md § 8) : titre, texte, et à droite le choix du
// langage (contrôle segmenté). Changer de langage garde le code saisi.
import type { ProgrammingLanguage } from '@scalar/shared/enums'

const language = defineModel<ProgrammingLanguage>('language', { required: true })

const choices: { value: ProgrammingLanguage; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
]
</script>

<template>
  <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div class="flex flex-col gap-1">
      <h1 class="font-display text-text text-3xl font-semibold tracking-tight md:text-4xl">
        Bac à sable
      </h1>
      <p class="text-label text-text-muted">
        Écrivez un script, exécutez-le, lisez sa sortie. Rien ici ne compte dans vos parcours.
      </p>
    </div>

    <div
      role="radiogroup"
      aria-label="Langage"
      class="rounded-row bg-surface-muted flex gap-0.5 p-0.75"
    >
      <button
        v-for="choice in choices"
        :key="choice.value"
        type="button"
        role="radio"
        :aria-checked="language === choice.value"
        class="min-h-11 flex-1 cursor-pointer rounded-lg px-3.5 text-sm md:min-h-0 md:py-1.5"
        :class="
          language === choice.value
            ? 'bg-surface text-text font-semibold'
            : 'text-text-muted font-medium'
        "
        @click="language = choice.value"
      >
        {{ choice.label }}
      </button>
    </div>
  </div>
</template>
