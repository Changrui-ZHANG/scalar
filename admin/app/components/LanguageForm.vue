<script setup lang="ts">
import type { FormSubmitEvent, RadioGroupItem } from '@nuxt/ui'

const props = defineProps<{
  initial: LanguageInput
  /** Creation ou edition : la page fournit l'ecriture dans la base. */
  save: (input: LanguageInput) => SaveResult<Language>
  submitLabel: string
  cancelTo: string
  editing?: boolean
}>()
const emit = defineEmits<{ saved: [language: Language] }>()

const RUNTIME_ITEMS: RadioGroupItem[] = [
  { label: RUNTIME_LABELS.node, value: 'node', description: 'Pour JavaScript.' },
  {
    label: RUNTIME_LABELS.node_strip_types,
    value: 'node_strip_types',
    description: 'Pour TypeScript : les annotations sont effacées, le code est exécuté tel quel.',
  },
]

const form = useTemplateRef('form')
const state = reactive<LanguageInput>({ ...props.initial })
const { markEdited } = useAutoSlug(
  () => state.label,
  (slug) => (state.slug = slug),
  props.editing,
)

function onSubmit(event: FormSubmitEvent<LanguageInput>) {
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
    :schema="languageInputSchema"
    :state="state"
    class="grid max-w-2xl gap-5"
    @submit="onSubmit"
  >
    <UFormField label="Nom" name="label" required>
      <UInput v-model="state.label" placeholder="Python" class="w-full" />
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

    <UFormField label="Exécution du code" name="runtime">
      <URadioGroup v-model="state.runtime" :items="RUNTIME_ITEMS" />
    </UFormField>

    <StatusRadio v-model="state.status" :allow-archived="editing" />

    <div class="flex gap-3">
      <UButton type="submit" :label="submitLabel" />
      <UButton label="Annuler" color="neutral" variant="ghost" :to="cancelTo" />
    </div>
  </UForm>
</template>
