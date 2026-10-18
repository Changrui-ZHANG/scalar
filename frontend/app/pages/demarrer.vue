<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useSeoMeta } from '#imports'
import BreadcrumbTrail from '@/components/BreadcrumbTrail.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import ExecutionOutput from '@/components/ExecutionOutput.vue'
import QuestionnaireResults from '@/components/QuestionnaireResults.vue'
import TestResults from '@/components/TestResults.vue'
import { useToast } from '@/composables/useToast'

useSeoMeta({
  title: 'Démarrer — Scalar',
  description: 'Questionnaire d\'évaluation pour déterminer votre niveau de départ',
})

interface QuestionOption {
  label: string
  value: string
}

interface Question {
  id: number | string
  type: 'multiple-choice' | 'text' | 'code'
  title: string
  description: string
  options: QuestionOption[]
  multiple: boolean
  placeholder?: string
  example?: string
  /** Fonction que les tests unitaires appellent ; exercices de code seulement. */
  functionName?: string
}

type Answer = string | string[]

const UNREACHABLE = 'Le service d’exécution n’a pas répondu. Vérifiez votre connexion puis réessayez.'

// Données du questionnaire
const questions = ref<Question[]>([])
const questionnaireId = ref<number | string | null>(null)

// État
const currentStep = ref(0)
const answers = ref<Record<string, Answer>>({})
/** Code de chaque exercice : passer d'une question à l'autre ne le perd pas. */
const codes = ref<Record<string, string>>({})
const verifications = ref<Record<string, VerificationResult>>({})
const verifyError = ref('')
const verifying = ref(false)
const isSubmitting = ref(false)
const isLoading = ref(false)
const toast = useToast()
// Ref de premier niveau : le template ne déballe pas `toast.toasts`
const { toasts } = toast
/** Évaluation renvoyée à la fin : elle remplace les questions sur la même page. */
const evaluation = ref<QuestionnaireEvaluation | null>(null)

// Simple update methods
function updateAnswer(questionId: Question['id'], value: Answer) {
  answers.value = {
    ...answers.value,
    [questionId]: value
  }
}

function toggleOption(questionId: Question['id'], optionValue: string) {
  const current = answers.value[questionId] || []
  const currentArray = Array.isArray(current) ? current : []

  if (currentArray.includes(optionValue)) {
    // Remove
    updateAnswer(questionId, currentArray.filter(v => v !== optionValue))
  } else {
    // Add
    updateAnswer(questionId, [...currentArray, optionValue])
  }
}

function dismiss(id: string) {
  toast.dismiss(id)
}

/** Nom de la fonction à tester : donné par l'API, sinon lu dans le code de départ. */
function functionNameOf(q: { functionName?: string, placeholder?: string }): string | undefined {
  return q.functionName ?? q.placeholder?.match(/function\s+([A-Za-z_$][\w$]*)/)?.[1]
}

// Récupérer un questionnaire aléatoire depuis l'API
async function fetchQuestionnaire() {
  isLoading.value = true
  try {
    const response = await fetch('/api/v1/questionnaires/random')
    if (!response.ok) {
      throw new Error('Failed to fetch questionnaire')
    }
    const responseData = await response.json()
    const questionnaire = responseData.data

    // Set the questionnaire ID for submission
    questionnaireId.value = questionnaire.id

    // Transformer les données du questionnaire pour qu'elles correspondent au format attendu par notre composant
    questions.value = questionnaire.questions.map((q: any): Question => {
      // Une question sans options attend une réponse rédigée.
      const type = q.type === 'code' ? 'code' : q.type === 'text' || !q.options?.length ? 'text' : 'multiple-choice'
      return {
        id: q.id,
        type,
        title: q.title,
        description: q.description || '',
        // La valeur est le libellé : l'évaluation lit la réponse telle qu'affichée.
        options: (q.options ?? []).map((option: string) => ({ label: option, value: option })),
        multiple: q.type === 'language-selection', // Special case for language selection
        placeholder: q.placeholder ?? (type === 'text' ? 'Entrez votre réponse ici' : undefined),
        example: q.example,
        functionName: type === 'code' ? functionNameOf(q) : undefined,
      }
    })
    // Chaque exercice démarre sur son code de départ.
    codes.value = Object.fromEntries(
      questions.value.filter(q => q.type === 'code').map(q => [q.id, q.placeholder ?? ''])
    )
  } catch (err) {
    toast.show({
      variant: 'destructive',
      title: 'Erreur',
      description: 'Impossible de charger le questionnaire. Veuillez réessayer plus tard.'
    })
    console.error('Failed to fetch questionnaire:', err)
    // Réinitialiser les questions en cas d'erreur pour éviter de tenter de rendre un état vide
    questions.value = []
  } finally {
    isLoading.value = false
  }
}

// Propriétés calculées
const currentQuestion = computed(() => {
  if (!questions.value || questions.value.length === 0) {
    return null
  }
  return questions.value[currentStep.value]
})
const isLastStep = computed(() => questions.value ? currentStep.value === questions.value.length - 1 : false)
const isFirstStep = computed(() => currentStep.value === 0)
const questionCount = computed(() => questions.value?.length ?? 0)
const progress = computed(() => {
  if (!questions.value || questionCount.value === 0) {
    return { done: 0, total: 0, percent: 0 }
  }
  return {
    done: currentStep.value + 1,
    total: questionCount.value,
    percent: Math.round(((currentStep.value + 1) / questionCount.value) * 100)
  }
})
const currentCode = computed({
  get: () => (currentQuestion.value ? codes.value[currentQuestion.value.id] ?? '' : ''),
  set: (value: string) => {
    if (currentQuestion.value) {
      codes.value = { ...codes.value, [currentQuestion.value.id]: value }
    }
  },
})
const currentVerification = computed(() =>
  currentQuestion.value ? verifications.value[currentQuestion.value.id] ?? null : null
)
/** La sortie brute n'apparaît que si le code a lui-même écrit quelque chose. */
const showOutput = computed(() => {
  const run = currentVerification.value?.execution.run
  return Boolean(run && (run.stdout || run.stderr))
})

// Fonctions de navigation
function goToNextStep() {
  if (questions.value && currentStep.value < questions.value.length - 1) {
    currentStep.value++
    verifyError.value = ''
  }
}

function goToPreviousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
    verifyError.value = ''
  }
}

/**
 * Lance les tests unitaires de l'exercice : le moteur appelle la fonction sur
 * chaque cas et compare ce qu'elle renvoie. Aucun `console.log` n'est requis.
 */
async function runTests() {
  const question = currentQuestion.value
  const code = currentCode.value
  if (!question || verifying.value || !code.trim()) return

  verifying.value = true
  verifyError.value = ''
  try {
    const response = await fetch('/api/v1/questionnaire-verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ functionName: question.functionName, code }),
    })
    const body = await response.json().catch(() => null) as ApiResponse<VerificationResult> | null
    if (!response.ok || !body?.data) {
      verifyError.value = body?.error ?? UNREACHABLE
      return
    }
    verifications.value = { ...verifications.value, [question.id]: body.data }
  } catch {
    verifyError.value = UNREACHABLE
  } finally {
    verifying.value = false
  }
}

function resetCode() {
  const question = currentQuestion.value
  if (!question) return
  currentCode.value = question.placeholder ?? ''
  const { [question.id]: _removed, ...rest } = verifications.value
  verifications.value = rest
  verifyError.value = ''
}

// Gérer la soumission du formulaire
async function handleSubmit() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    // Le serveur recorrige chaque exercice : le niveau ne dépend pas d'un verdict local.
    const submissionData = {
      questionnaireId: questionnaireId.value,
      answers: answers.value,
      submissions: questions.value
        .filter(q => q.type === 'code' && q.functionName)
        .map(q => ({ questionId: q.id, functionName: q.functionName, code: codes.value[q.id] ?? '' })),
    }

    const response = await fetch('/api/v1/questionnaire-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    })
    const body = await response.json().catch(() => null) as ApiResponse<QuestionnaireEvaluation> | null

    if (!response.ok || !body?.data) {
      throw new Error(body?.error ?? 'Failed to submit questionnaire')
    }

    evaluation.value = body.data
    await nextTick()
    // Les résultats prennent la place des questions : on remonte en haut de page.
    if (import.meta.client) window.scrollTo?.({ top: 0, behavior: 'smooth' })
  } catch (err) {
    toast.show({
      variant: 'destructive',
      title: 'Erreur',
      description: 'Une erreur est survenue lors de la soumission.'
    })
    console.error('Failed to submit questionnaire:', err)
  } finally {
    isSubmitting.value = false
  }
}

// Repartir de zéro, sur un nouveau questionnaire tiré au hasard
function restart() {
  evaluation.value = null
  currentStep.value = 0
  answers.value = {}
  verifications.value = {}
  verifyError.value = ''
  fetchQuestionnaire()
}

// Récupérer le questionnaire lorsque le composant est monté
onMounted(() => {
  fetchQuestionnaire()
})
</script>

<template>
  <div class="grid gap-8 py-10">
    <!-- Notifications toast -->
    <div
      class="pointer-events-none fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3"
      aria-live="polite"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        role="status"
        class="pointer-events-auto relative grid gap-1 rounded-lg border p-4 pr-10 shadow-sm"
        :class="{
          'border-danger/40 bg-danger-soft text-danger': t.variant === 'destructive',
          'border-success/40 bg-success-soft text-success': t.variant === 'success',
          'bg-surface text-foreground': t.variant === 'default',
        }"
      >
        <p class="text-sm font-semibold">{{ t.title }}</p>
        <p v-if="t.description" class="text-sm opacity-90">{{ t.description }}</p>
        <button
          type="button"
          class="absolute top-2 right-2 rounded-md p-1 hover:bg-foreground/10"
          aria-label="Fermer la notification"
          @click="dismiss(t.id)"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <BreadcrumbTrail :items="[{ label: 'Accueil', to: '/' }, { label: 'Démarrer' }]" />

    <header class="grid gap-2">
      <p class="eyebrow">Évaluation initiale</p>
      <h1 class="text-4xl font-semibold sm:text-5xl">Questionnaire de démarrage</h1>
      <p class="text-muted-foreground max-w-prose">
        Ce questionnaire nous permettra d'évaluer votre niveau actuel et de vous proposer un parcours d'apprentissage adapté.
        Certaines questions nécessitent d'écrire du code qui sera exécuté dans un environnement sécurisé.
      </p>
    </header>

    <QuestionnaireResults v-if="evaluation" :evaluation="evaluation" @restart="restart" />

    <!-- Progression -->
    <div v-if="!evaluation" class="grid gap-2">
      <div class="text-body-sm flex justify-between gap-4">
        <span class="text-muted-foreground">
          Étape {{ questionCount ? currentStep + 1 : 0 }} sur {{ questionCount }}
        </span>
        <span class="font-semibold tabular-nums">{{ progress.percent }} %</span>
      </div>
      <div
        role="progressbar"
        :aria-valuenow="progress.percent"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Progression : ${progress.percent} %`"
        class="bg-foreground/10 h-2 overflow-hidden rounded-full"
      >
        <div
          class="bg-brand h-full rounded-full transition-[width] duration-500"
          :style="{ width: `${progress.percent}%` }"
        />
      </div>
    </div>

    <!-- Question -->
    <section v-if="!evaluation" class="card grid gap-6 p-5 sm:p-6" aria-live="polite">
      <p v-if="isLoading" class="text-muted-foreground py-8 text-center">
        Chargement du questionnaire…
      </p>

      <p v-else-if="!currentQuestion" class="text-muted-foreground py-8 text-center">
        Aucune question disponible. Veuillez réessayer.
      </p>

      <template v-else>
        <div class="grid gap-2">
          <p class="eyebrow">Question {{ currentStep + 1 }}</p>
          <h2 class="text-title">{{ currentQuestion.title }}</h2>
          <p v-if="currentQuestion.description" class="text-muted-foreground">
            {{ currentQuestion.description }}
          </p>
        </div>

        <!-- Choix unique -->
        <div
          v-if="currentQuestion.type === 'multiple-choice' && !currentQuestion.multiple"
          class="grid gap-3"
          role="radiogroup"
        >
          <label
            v-for="option in currentQuestion.options"
            :key="option.value"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors select-none"
            :class="answers[currentQuestion.id] === option.value
              ? 'border-brand bg-brand/10'
              : 'hover:bg-foreground/5'"
          >
            <input
              :id="`q${currentQuestion.id}-option-${option.value}`"
              type="radio"
              :name="`q${currentQuestion.id}`"
              :value="option.value"
              :checked="answers[currentQuestion.id] === option.value"
              class="accent-brand h-4 w-4 shrink-0"
              @change="updateAnswer(currentQuestion.id, option.value)"
            >
            <span class="font-medium">{{ option.label }}</span>
          </label>
        </div>

        <!-- Choix multiple -->
        <div
          v-else-if="currentQuestion.type === 'multiple-choice'"
          class="grid gap-3 sm:grid-cols-2"
        >
          <label
            v-for="option in currentQuestion.options"
            :key="option.value"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors select-none"
            :class="(answers[currentQuestion.id] || []).includes(option.value)
              ? 'border-brand bg-brand/10'
              : 'hover:bg-foreground/5'"
          >
            <input
              :id="`q${currentQuestion.id}-option-${option.value}`"
              type="checkbox"
              :name="`q${currentQuestion.id}[]`"
              :value="option.value"
              :checked="(answers[currentQuestion.id] || []).includes(option.value)"
              class="accent-brand h-4 w-4 shrink-0"
              @change="toggleOption(currentQuestion.id, option.value)"
            >
            <span class="font-medium">{{ option.label }}</span>
          </label>
        </div>

        <!-- Réponse libre -->
        <textarea
          v-else-if="currentQuestion.type === 'text'"
          :id="`question-${currentQuestion.id}`"
          :value="answers[currentQuestion.id] ?? ''"
          :placeholder="currentQuestion.placeholder || ''"
          rows="4"
          class="bg-background w-full rounded-lg border p-3"
          @input="updateAnswer(currentQuestion.id, ($event.target as HTMLTextAreaElement).value)"
        />

        <!-- Exercice de code -->
        <div v-else-if="currentQuestion.type === 'code'" class="grid gap-4">
          <pre
            v-if="currentQuestion.example"
            class="bg-foreground/5 text-body-sm overflow-x-auto rounded-lg p-4 font-mono whitespace-pre-wrap"
          >{{ currentQuestion.example }}</pre>

          <p class="text-body-sm text-muted-foreground">
            Gardez le nom <code class="font-mono">{{ currentQuestion.functionName }}</code> et
            renvoyez le résultat avec <code class="font-mono">return</code> : les tests appellent
            votre fonction et comparent ce qu'elle renvoie, sans besoin de <code class="font-mono">console.log</code>.
          </p>

          <CodeEditor
            :id="`code-editor-${currentQuestion.id}`"
            v-model="currentCode"
            label="Votre code"
            filename="main.js"
            :rows="12"
            class="w-full"
          />

          <div class="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              :disabled="verifying"
              class="btn-secondary"
              @click="resetCode"
            >
              Réinitialiser
            </button>

            <button
              type="button"
              :disabled="verifying || !currentCode.trim()"
              class="btn-primary"
              @click="runTests"
            >
              {{ verifying ? 'Tests en cours…' : 'Lancer les tests' }}
            </button>
          </div>

          <div v-if="verifyError" role="alert" class="alert-error">
            {{ verifyError }}
          </div>
          <template v-if="currentVerification">
            <TestResults :verification="currentVerification" />
            <ExecutionOutput v-if="showOutput" :result="currentVerification.execution" />
          </template>
        </div>
      </template>
    </section>

    <!-- Navigation -->
    <div v-if="currentQuestion && !evaluation" class="flex flex-wrap items-center justify-between gap-3">
      <button
        v-if="!isFirstStep"
        type="button"
        class="btn-secondary"
        @click="goToPreviousStep"
      >
        Étape précédente
      </button>
      <span v-else />

      <button
        v-if="!isLastStep"
        type="button"
        class="btn-primary"
        @click="goToNextStep"
      >
        Étape suivante
      </button>
      <button
        v-else
        type="button"
        class="btn-primary"
        :disabled="isSubmitting"
        @click="handleSubmit"
      >
        {{ isSubmitting ? 'Évaluation en cours…' : 'Terminer le questionnaire' }}
      </button>
    </div>
  </div>
</template>
