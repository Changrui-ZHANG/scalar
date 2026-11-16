<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  initial: LessonInput
  /** Creation ou edition : la page fournit l'ecriture dans la base. */
  save: (input: LessonInput) => Promise<SaveResult<Lesson>>
  submitLabel: string
  cancelTo: string
  editing?: boolean
}>()
const emit = defineEmits<{ saved: [lesson: Lesson] }>()

const form = useTemplateRef('form')
const toast = useToast()
const state = reactive<LessonInput>({ ...props.initial })
const { markEdited } = useAutoSlug(
  () => state.title,
  (slug) => (state.slug = slug),
  props.editing,
)

async function onSubmit(event: FormSubmitEvent<LessonInput>) {
  const result = await props.save(event.data)
  if (!result.ok) {
    if (result.field) {
      form.value?.setErrors([{ name: result.field, message: result.message }])
    } else {
      toast.add({ title: result.message, color: 'error' })
    }
    return
  }
  emit('saved', result.item)
}
</script>

<template>
  <UForm
    ref="form"
    :schema="lessonInputSchema"
    :state="state"
    class="grid max-w-5xl gap-5"
    @submit="onSubmit"
  >
    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField label="Titre" name="title" required>
        <UInput v-model="state.title" placeholder="Les tableaux" class="w-full" />
      </UFormField>
      <UFormField label="Slug" name="slug" required help="Utilisé dans l’URL de la leçon.">
        <UInput
          v-model="state.slug"
          placeholder="tableaux"
          class="w-full font-mono"
          @update:model-value="markEdited"
        />
      </UFormField>
    </div>

    <UFormField
      label="Résumé"
      name="summary"
      required
      help="Une phrase, affichée dans la liste des leçons."
    >
      <UTextarea v-model="state.summary" :rows="2" autoresize class="w-full" />
    </UFormField>

    <UFormField
      label="Cours"
      name="body"
      required
      help="Markdown : `code`, listes « - », blocs ``` et titres « ## ». L’aperçu montre le rendu sur le site."
    >
      <div class="grid gap-3 lg:grid-cols-2">
        <CodeField
          v-model="state.body"
          language="markdown"
          label="Cours, en Markdown"
          placeholder="## Les tableaux…"
        />
        <MarkdownPreview
          :source="state.body"
          class="border-default rounded-md border border-dashed p-3"
        />
      </div>
    </UFormField>

    <StatusRadio v-if="editing" v-model="state.status" allow-archived />

    <slot name="note" />

    <div class="flex gap-3">
      <UButton type="submit" :label="submitLabel" />
      <UButton label="Annuler" color="neutral" variant="ghost" :to="cancelTo" />
    </div>
  </UForm>
</template>
