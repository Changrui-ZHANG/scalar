<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  initial: ExerciseInput
  /** Creation ou edition : la page fournit l'ecriture dans la base. */
  save: (input: ExerciseInput) => SaveResult<Exercise>
  submitLabel: string
  cancelTo: string
  /** Coloration du code de depart et de la solution : celle du parcours. */
  codeLanguage: 'javascript' | 'typescript'
  editing?: boolean
}>()
const emit = defineEmits<{ saved: [exercise: Exercise] }>()

const form = useTemplateRef('form')
// Copie profonde : les cas de test sont edites sans toucher a `initial`.
const state = reactive<ExerciseInput>(structuredClone(toRaw(props.initial)))
const { markEdited } = useAutoSlug(
  () => state.title,
  (slug) => (state.slug = slug),
  props.editing,
)

function onSubmit(event: FormSubmitEvent<ExerciseInput>) {
  const result = props.save(event.data)
  if (!result.ok) {
    form.value?.setErrors([{ name: result.field, message: result.message }])
    return
  }
  emit('saved', result.item)
}
</script>

<template>
  <UForm
    ref="form"
    :schema="exerciseInputSchema"
    :state="state"
    class="grid max-w-5xl gap-5"
    @submit="onSubmit"
  >
    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField label="Titre" name="title" required>
        <UInput v-model="state.title" placeholder="Aire d’un rectangle" class="w-full" />
      </UFormField>
      <UFormField label="Slug" name="slug" required>
        <UInput
          v-model="state.slug"
          placeholder="aire-rectangle"
          class="w-full font-mono"
          @update:model-value="markEdited"
        />
      </UFormField>
    </div>

    <UFormField
      label="Énoncé"
      name="statement"
      required
      help="Markdown : `code`, listes « - », blocs ``` et titres « ## ». L’aperçu montre le rendu sur le site."
    >
      <div class="grid gap-3 lg:grid-cols-2">
        <CodeField
          v-model="state.statement"
          language="markdown"
          label="Énoncé, en Markdown"
          placeholder="Écris une fonction `area(width, height)`…"
        />
        <MarkdownPreview
          :source="state.statement"
          class="border-default rounded-md border border-dashed p-3"
        />
      </div>
    </UFormField>

    <UFormField
      label="Nom de la fonction"
      name="functionName"
      required
      help="La fonction que les cas de test appellent dans le code de l’apprenant."
    >
      <UInput v-model="state.functionName" placeholder="area" class="w-full font-mono" />
    </UFormField>

    <div class="grid gap-5 lg:grid-cols-2">
      <UFormField label="Code de départ" name="starterCode" required>
        <CodeField
          v-model="state.starterCode"
          :language="codeLanguage"
          label="Code de départ"
          placeholder="function area(width, height) {}"
        />
      </UFormField>
      <UFormField label="Solution" name="solutionCode" required>
        <CodeField
          v-model="state.solutionCode"
          :language="codeLanguage"
          label="Solution"
          placeholder="function area(width, height) { return width * height }"
        />
      </UFormField>
    </div>

    <TestCasesField v-model="state.testCases" :function-name="state.functionName" />

    <UFormField
      label="Indices"
      name="hints"
      help="Un indice par ligne, du plus vague au plus précis."
    >
      <UTextarea v-model="state.hints" :rows="3" autoresize class="w-full" />
    </UFormField>

    <StatusRadio v-model="state.status" :allow-archived="editing" />

    <slot name="note" />

    <div class="flex gap-3">
      <UButton type="submit" :label="submitLabel" />
      <UButton label="Annuler" color="neutral" variant="ghost" :to="cancelTo" />
    </div>
  </UForm>
</template>
