<script setup lang="ts">
const props = defineProps<{ exercise: Exercise }>()
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
      Porte sur la dernière version enregistrée. Obligatoire avant de publier.
    </p>
    <ul v-if="report" class="grid gap-2 text-sm">
      <li v-for="(item, i) in report.checks" :key="i" class="flex items-start gap-2">
        <UIcon
          :name="item.passed ? 'i-lucide-check' : 'i-lucide-x'"
          :class="item.passed ? 'text-success' : 'text-error'"
          class="mt-0.5 shrink-0"
        />
        <div>
          <p>{{ item.label }}</p>
          <p v-if="item.detail" class="text-muted font-mono text-xs">{{ item.detail }}</p>
        </div>
      </li>
    </ul>
    <pre
      v-if="report?.stderr"
      class="bg-elevated overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap"
      >{{ report.stderr }}</pre>
  </section>
</template>
