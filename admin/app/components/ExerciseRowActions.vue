<script setup lang="ts">
const props = defineProps<{ exercise: Exercise; editTo: string }>()
const emit = defineEmits<{ updated: [exercise: Exercise] }>()

const store = useContentStore()
const toast = useToast()
const busy = ref(false)

const isOnline = computed(() => props.exercise.status === 'published')
const isVerified = computed(() => props.exercise.solutionCheckStatus === 'passed')

async function check() {
  busy.value = true
  const result = await store.checkSolution(props.exercise.id)
  busy.value = false
  if (!result.ok) {
    toast.add({ title: result.message, color: 'error' })
    return
  }
  emit('updated', result.data.exercise)
  toast.add(
    result.data.passed
      ? { title: `« ${props.exercise.title} » : solution vérifiée`, color: 'success' }
      : { title: `« ${props.exercise.title} » : la solution échoue`, color: 'error' },
  )
}

async function togglePublication() {
  busy.value = true
  const result = await store.setExerciseStatus(
    props.exercise.id,
    isOnline.value ? 'draft' : 'published',
  )
  busy.value = false
  if (!result.ok) {
    toast.add({ title: result.message, color: 'error' })
    return
  }
  emit('updated', result.item)
}
</script>

<template>
  <div class="flex justify-end gap-2">
    <UButton label="Modifier" size="sm" color="neutral" variant="outline" :to="editTo" />
    <UButton
      label="Vérifier"
      size="sm"
      color="neutral"
      variant="outline"
      :disabled="busy"
      @click="check"
    />
    <UButton
      :label="isOnline ? 'Dépublier' : 'Publier'"
      size="sm"
      :color="isOnline ? 'neutral' : 'primary'"
      :disabled="busy || (!isOnline && !isVerified)"
      :title="!isOnline && !isVerified ? 'Vérifiez d’abord la solution.' : undefined"
      @click="togglePublication"
    />
  </div>
</template>
