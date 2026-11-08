<script setup lang="ts">
import type { FormSubmitEvent, RadioGroupItem } from '@nuxt/ui'

const props = defineProps<{
  initial: TrackInput
  /** Creation ou edition : la page fournit l'ecriture dans la base. */
  save: (input: TrackInput) => Promise<SaveResult<Track>>
  submitLabel: string
  cancelTo: string
  editing?: boolean
}>()
const emit = defineEmits<{ saved: [track: Track] }>()

const NO_LANGUAGE = 'none'
const LANGUAGE_ITEMS: RadioGroupItem[] = [
  { label: LANGUAGE_LABELS.javascript, value: 'javascript' },
  { label: LANGUAGE_LABELS.typescript, value: 'typescript' },
  {
    label: NO_LANGUAGE_LABEL,
    value: NO_LANGUAGE,
    description: 'Ce parcours n’aura pas d’exercice.',
  },
]

const form = useTemplateRef('form')
const toast = useToast()
const state = reactive<TrackInput>({ ...props.initial })
const { markEdited } = useAutoSlug(
  () => state.name,
  (slug) => (state.slug = slug),
  props.editing,
)
const language = computed({
  get: () => state.programmingLanguage ?? NO_LANGUAGE,
  set: (value) => {
    state.programmingLanguage = value === NO_LANGUAGE ? null : (value as ProgrammingLanguage)
  },
})

async function onSubmit(event: FormSubmitEvent<TrackInput>) {
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
    :schema="trackInputSchema"
    :state="state"
    class="grid max-w-2xl gap-5"
    @submit="onSubmit"
  >
    <UFormField label="Nom" name="name" required>
      <UInput v-model="state.name" placeholder="Python" class="w-full" />
    </UFormField>

    <UFormField label="Slug" name="slug" required help="Utilisé dans l’URL du parcours.">
      <UInput
        v-model="state.slug"
        placeholder="python"
        class="w-full font-mono"
        @update:model-value="markEdited"
      />
    </UFormField>

    <UFormField
      label="Résumé"
      name="summary"
      required
      help="Une phrase, affichée sur la page Parcours."
    >
      <UTextarea v-model="state.summary" :rows="2" autoresize class="w-full" />
    </UFormField>

    <UFormField label="Langage des exercices" name="programmingLanguage">
      <URadioGroup v-model="language" :items="LANGUAGE_ITEMS" />
    </UFormField>

    <StatusRadio v-if="editing" v-model="state.status" allow-archived />

    <div class="flex gap-3">
      <UButton type="submit" :label="submitLabel" />
      <UButton label="Annuler" color="neutral" variant="ghost" :to="cancelTo" />
    </div>
  </UForm>
</template>
