<script setup lang="ts">
import type { ProgrammingLanguage } from '@scalar/shared/enums'

interface Props {
  instructions: string
  language: ProgrammingLanguage | null
}

defineProps<Props>()

const emit = defineEmits<{
  try: [code: string, language: ProgrammingLanguage]
}>()
</script>

<template>
  <div class="prose max-w-none text-sm leading-relaxed text-text">
    <ContentRichText
      :source="instructions"
      :language="language"
      :tryable="true"
      variant="compact"
      @try="(code, lang) => emit('try', code, lang)"
    />
  </div>
</template>
