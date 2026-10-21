<script setup lang="ts">
import type { LessonDetail } from '@scalar/shared/api'
import type { ProgrammingLanguage } from '@scalar/shared/enums'

interface Props {
  lesson: LessonDetail
}

defineProps<Props>()

const emit = defineEmits<{
  try: [code: string, language: ProgrammingLanguage]
}>()
</script>

<template>
  <div class="prose max-w-none">
    <ContentRichText
      :source="lesson.body"
      :language="lesson.track.programmingLanguage"
      :tryable="true"
      variant="page"
      @try="(code, lang) => emit('try', code, lang)"
    />
  </div>
</template>
