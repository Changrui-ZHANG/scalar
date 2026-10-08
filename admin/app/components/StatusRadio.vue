<script setup lang="ts">
import type { RadioGroupItem } from '@nuxt/ui'

const status = defineModel<ContentStatus>({ required: true })

// L'archivage concerne un contenu existant : il n'est propose qu'en edition.
const props = defineProps<{ allowArchived?: boolean }>()

const ITEMS: RadioGroupItem[] = [
  { label: STATUS_LABELS.draft, value: 'draft', description: 'Invisible sur le site.' },
  { label: STATUS_LABELS.published, value: 'published', description: 'Visible sur le site.' },
  {
    label: STATUS_LABELS.archived,
    value: 'archived',
    description: 'Retiré du site, conservé ici.',
  },
]
const items = computed(() => (props.allowArchived ? ITEMS : ITEMS.slice(0, 2)))
</script>

<template>
  <UFormField label="Statut" name="status">
    <URadioGroup v-model="status" :items="items" />
  </UFormField>
</template>
