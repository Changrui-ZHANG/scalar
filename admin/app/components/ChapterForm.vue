<script setup lang="ts">
import type { FormSubmitEvent, RadioGroupItem } from '@nuxt/ui'

const props = defineProps<{
  initial: ChapterInput
  /** Creation ou edition : la page fournit l'ecriture dans la base. */
  save: (input: ChapterInput) => Promise<SaveResult<Chapter>>
  submitLabel: string
  cancelTo: string
  editing?: boolean
}>()
const emit = defineEmits<{ saved: [chapter: Chapter] }>()

const LEVEL_ITEMS: RadioGroupItem[] = Object.entries(LEVEL_LABELS).map(([value, label]) => ({
  label,
  value,
}))

const form = useTemplateRef('form')
const toast = useToast()
const state = reactive<ChapterInput>({ ...props.initial })
const { markEdited } = useAutoSlug(
  () => state.title,
  (slug) => (state.slug = slug),
  props.editing,
)

async function onSubmit(event: FormSubmitEvent<ChapterInput>) {
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
    :schema="chapterInputSchema"
    :state="state"
    class="grid max-w-2xl gap-5"
    @submit="onSubmit"
  >
    <UFormField label="Titre" name="title" required>
      <UInput v-model="state.title" placeholder="Tableaux" class="w-full" />
    </UFormField>

    <UFormField label="Slug" name="slug" required help="Utilisé dans l’URL du chapitre.">
      <UInput
        v-model="state.slug"
        placeholder="tableaux"
        class="w-full font-mono"
        @update:model-value="markEdited"
      />
    </UFormField>

    <UFormField
      label="Niveau"
      name="level"
      help="Un chapitre qui change de niveau passe à la fin de son nouveau niveau."
    >
      <URadioGroup v-model="state.level" :items="LEVEL_ITEMS" orientation="horizontal" />
    </UFormField>

    <UFormField
      label="Résumé"
      name="summary"
      required
      help="Quelques lignes, affichées sur le parcours."
    >
      <UTextarea v-model="state.summary" :rows="3" autoresize class="w-full" />
    </UFormField>

    <StatusRadio v-if="editing" v-model="state.status" allow-archived />

    <slot name="note" />

    <div class="flex gap-3">
      <UButton type="submit" :label="submitLabel" />
      <UButton label="Annuler" color="neutral" variant="ghost" :to="cancelTo" />
    </div>
  </UForm>
</template>
