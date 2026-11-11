<script setup lang="ts">
const props = defineProps<{
  exercise: Exercise
  /** Enregistre le formulaire avant de verifier ; `null` annule la verification. */
  beforeCheck?: () => Promise<Exercise | null>
}>()
const emit = defineEmits<{ checked: [exercise: Exercise] }>()

const store = useContentStore()
const toast = useToast()
const checking = ref(false)
const report = ref<SolutionCheck | null>(null)

// L'API remet ce statut a zero quand le code change : le rapport affiche serait perime.
watch(
  () => props.exercise.solutionCheckStatus,
  (status) => {
    if (status === 'not_checked') {
      report.value = null
    }
  },
)

async function check() {
  checking.value = true
  if (props.beforeCheck && !(await props.beforeCheck())) {
    checking.value = false
    return
  }
  const result = await store.checkSolution(props.exercise.id)
  checking.value = false
  if (!result.ok) {
    toast.add({ title: result.message, color: 'error' })
    return
  }
  report.value = result.data
  emit('checked', result.data.exercise)
}
</script>

<template>
  <section class="border-default grid max-w-5xl gap-3 rounded-lg border p-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="font-medium">Vérification de la solution</h2>
      <SolutionCheckBadge :status="exercise.solutionCheckStatus" />
      <UButton
        class="ms-auto"
        icon="i-lucide-play"
        label="Vérifier la solution"
        :loading="checking"
        @click="check"
      />
    </div>
    <p class="text-muted text-sm">
      Enregistre le formulaire, puis vérifie sa solution. Obligatoire avant de publier.
    </p>
    <VerdictList v-if="report" :checks="report.checks" />
    <pre
      v-if="report?.stderr"
      class="bg-elevated overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap"
      >{{ report.stderr }}</pre>
  </section>
</template>
