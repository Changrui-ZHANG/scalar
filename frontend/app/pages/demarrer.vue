<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSeoMeta } from '#imports'
import { useExecution } from '@/composables/useExecution'
import BreadcrumbTrail from '@/components/BreadcrumbTrail.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import ExecutionOutput from '@/components/ExecutionOutput.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { useToast } from '@/composables/useToast'

useSeoMeta({
  title: 'Démarrer — Scalar',
  description: 'Questionnaire d\'évaluation pour déterminer votre niveau de départ',
})

// Données du questionnaire
const questions = ref([])
const questionnaireId = ref(null)

// État
const currentStep = ref(0)
const answers = ref({})
const { result, error, running, run } = useExecution()
const localCode = ref('')
const isSubmitting = ref(false)
const toast = useToast()

// Simple update methods
function updateAnswer(questionId, value) {
  answers.value = {
    ...answers.value,
    [questionId]: value
  }
}

function toggleOption(questionId, optionValue) {
  const current = (answers.value || {})[questionId] || []
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

// Récupérer un questionnaire aléatoire depuis l'API
async function fetchQuestionnaire() {
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
    questions.value = questionnaire.questions.map(q => ({
      id: q.id,
      type: q.type === 'text' || q.type === 'code' ? q.type : 'multiple-choice', // Map all other types to multiple-choice for UI compatibility
      title: q.title,
      description: q.description || '',
      options: q.options ? q.options.map(option => ({
        label: option,
        value: option.toLowerCase().replace(/\s+/g, '-')
      })) : undefined,
      multiple: q.type === 'language-selection', // Special case for language selection
      placeholder: q.type === 'text' ? 'Entrez votre réponse ici' : undefined,
      example: q.type === 'code' ? '// Exemple de code' : undefined,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      theoreticalContent: q.theoreticalContent
    }))
  } catch (err) {
    toast.show({
      variant: 'destructive',
      title: 'Erreur',
      description: 'Impossible de charger le questionnaire. Veuillez réessayer plus tard.'
    })
    console.error('Failed to fetch questionnaire:', err)
  }
}

// Propriétés calculées
const currentQuestion = computed(() => questions.value ? questions.value[currentStep.value] : null)
const isLastStep = computed(() => questions.value ? currentStep.value === questions.value.length - 1 : false)
const isFirstStep = computed(() => currentStep.value === 0)
const questionCount = computed(() => questions.value?.length ?? 0)
const progress = computed(() => {
  if (!questions.value) {
    return { done: 0, total: 0, percent: 0 }
  }
  return {
    done: currentStep.value + 1,
    total: questionCount.value,
    percent: Math.round(((currentStep.value + 1) / questionCount.value) * 100)
  }
})

// Fonctions de navigation
function goToNextStep() {
  if (questions.value && currentStep.value < questions.value.length - 1) {
    currentStep.value++
  }
}

function goToPreviousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Gestionnaire d'exécution de code
async function handleCodeExecution() {
  if (!localCode.value.trim()) return
  await run(localCode.value)
}

// Gérer la soumission du formulaire
async function handleSubmit() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    // Préparer les données de soumission
    const submissionData = {
      questionnaireId: questionnaireId.value,
      questionsCount: questions.value.length,
      answers: answers.value,
      completedAt: new Date().toISOString()
    }

    // Envoyer les résultats au backend
    const response = await fetch('/api/v1/questionnaire-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    })

    if (!response.ok) {
      throw new Error('Failed to submit questionnaire')
    }

    // Afficher le message de succès
    toast.show({
      variant: 'success',
      title: 'Questionnaire terminé',
      description: 'Votre questionnaire a été soumis avec succès.'
    })

    // Réinitialiser le formulaire pour une prochaine utilisation
    resetForm()
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

// Réinitialiser le formulaire
function resetForm() {
  currentStep.value = 0
  answers.value = {}
  localCode.value = ''
  isSubmitting.value = false
}

// Récupérer le questionnaire lorsque le composant est monté
onMounted(() => {
  fetchQuestionnaire()
})
</script>

<template>
  <div class="grid gap-8 py-10">
    <!-- Notifications toast -->
    <div class="fixed top-4 right-4 z-50 flex flex-col-reverse gap-4 p-4 pointer-events-none">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="w-80 relative flex items-start gap-4 rounded-border p-6"
        :class="[
          toast.variant === 'destructive' ? 'border-border-600 bg-border-50' :
          toast.variant === 'success' ? 'border-success-600 bg-success-50' :
          'border-muted-200 bg-muted-50'
        ]"
      >
        <div class="flex-shrink-0 flex h-10 w-10 items-center justify-center"
             :class="{
               'text-border-600': toast.variant === 'destructive',
               'text-success-600': toast.variant === 'success',
               'text-muted-400': toast.variant === 'default'
             }">
          <!-- Simple toast icon -->
          <div class="flex h-4 w-4 items-center justify-center"
               :class="{
                 'rotate-45': toast.variant === 'destructive'
               }">
            <div class="flex h-4 w-4"
                 :class="{
                   'bg-border-600': toast.variant === 'destructive',
                   'bg-success-600': toast.variant === 'success',
                   'bg-muted-400': toast.variant === 'default'
                 }">
              <!-- X for destructive, check for success, info for default -->
              <div v-if="toast.variant === 'destructive'" class="flex h-2 w-2 items-center justify-center bg-white">
                <div class="h-0.5 w-2 bg-white"></div>
              </div>
              <div v-else-if="toast.variant === 'success'" class="flex h-2 w-2 items-center justify-center bg-white">
                <div class="h-1.5 w-0.5 bg-white"></div>
                <div class="h-0.5 w-1 bg-white mt-[-2px] rotate-45"></div>
              </div>
              <div v-else class="flex h-2 w-2 items-center justify-center bg-muted-600">
                <div class="h-2 w-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex-1 space-y-2">
          <div class="text-sm font-medium"
               :class="{
                 'text-border-600': toast.variant === 'destructive',
                 'text-success-600': toast.variant === 'success',
                 'text-muted-800': toast.variant === 'default'
               }">
            {{ toast.title }}
          </div>
          <div v-if="toast.description" class="text-sm"
               :class="{
                 'text-border-500': toast.variant === 'destructive',
                 'text-success-500': toast.variant === 'success',
                 'text-muted-600': toast.variant === 'default'
               }">
            {{ toast.description }}
          </div>
        </div>
        <button
          @click="dismiss(toast.id)"
          class="absolute top-2 right-2 rounded-box p-1 text-sm hover:bg-accent/20"
          :class="{
            'text-border-600 hover:bg-border-50': toast.variant === 'destructive',
            'text-success-600 hover:bg-success-50': toast.variant === 'success',
            'text-muted-400 hover:bg-muted-100': toast.variant === 'default'
          }"
          aria-label="Close toast"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <BreadcrumbTrail :items="[{ label: 'Accueil', to: '/' }, { label: 'Démarrer' }]" />

    <header class="grid gap-2">
      <p class="eyebrow">Évaluation initiale</p>
      <h1 class="text-4xl font-semibold sm:text-5xl">Questionnaire de démarrage</h1>
      <p class="text-muted-foreground max-w-prose">
        Ce questionnaire nous permettra de évaluer votre niveau actuel et de vous proposer un parcours d'apprentissage adapté.
        Certaines questions nécessitent d'écrire du code qui sera exécuté dans un environnement sécurisé.
      </p>
    </header>

    <!-- Progress Indicator -->
    <div class="grid gap-4">
      <ProgressBar :progress="progress" />
      <div class="text-sm text-muted-foreground">
        Étape {{ currentStep + 1 }} sur {{ questionCount }}
      </div>
    </div>

    <!-- Question Container -->
    <div class="grid gap-6">
      <!-- Question Header -->
      <div class="grid gap-3">
        <h2 class="text-2xl font-semibold">
          Question {{ currentQuestion?.id ?? '?' }}
        </h2>
        <p class="text-muted-foreground">
          {{ currentQuestion?.description ?? '' }}
        </p>
      </div>

      <!-- Question Content -->
      <div class="grid gap-4">
        <!-- Multiple Choice (Single) -->
        <div v-if="currentQuestion && currentQuestion.type === 'multiple-choice' && !currentQuestion.multiple">
          <div class="grid gap-3">
            <label v-for="(option, index) in (currentQuestion.options || [])" :key="option.value" class="cursor-pointer select-none">
              <div class="flex items-start gap-3 rounded-border p-4 hover:bg-accent/50 transition-colors"
                   :class="(answers || {})[currentQuestion.id] === option.value ? 'bg-accent/20' : ''">
                <input type="radio"
                       :id="'q' + currentQuestion.id + '-option-' + option.value"
                       :name="`q${currentQuestion.id}`"
                       :value="option.value"
                       :checked="(answers || {})[currentQuestion.id] === option.value"
                       @change="updateAnswer(currentQuestion.id, option.value)"
                       class="h-4 w-4 text-brand">
                <div>
                  <div class="font-medium">{{ option.label }}</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Multiple Choice (Multiple) -->
        <div v-else-if="currentQuestion && currentQuestion.type === 'multiple-choice' && currentQuestion.multiple">
          <div class="grid gap-2">
            <label v-for="option in (currentQuestion.options || [])" :key="option.value" class="cursor-pointer select-none">
              <div class="flex items-start gap-3 rounded-border p-4 hover:bg-accent/50 transition-colors"
                   :class="((answers || {})[currentQuestion.id] || []).includes(option.value) ? 'bg-accent/20' : ''">
                <input type="checkbox"
                       :id="'q' + currentQuestion.id + '-option-' + option.value"
                       :name="`q${currentQuestion.id}[]`"
                       :value="option.value"
                       :checked="((answers || {})[currentQuestion.id] || []).includes(option.value)"
                       @change="toggleOption(currentQuestion.id, option.value)"
                       class="h-4 w-4 text-brand">
                <div>
                  <div class="font-medium">{{ option.label }}</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Text Input -->
        <div v-else-if="currentQuestion && currentQuestion.type === 'text'">
          <textarea
            :id="'question-' + currentQuestion.id"
            :value="((answers || {})[currentQuestion.id] ?? '')"
            :placeholder="currentQuestion?.placeholder || ''"
            rows="4"
            class="textarea w-full"
            @input="e => updateAnswer(currentQuestion.id, e.target.value)"
          />
        </div>

        <!-- Code Exercise -->
        <div v-else-if="currentQuestion && currentQuestion.type === 'code'">
          <div class="grid gap-4">
            <CodeEditor
              :id="'code-editor-' + (currentQuestion?.id ?? '')"
              v-model="localCode"
              :placeholder="currentQuestion?.placeholder"
              :example="currentQuestion?.example"
              filename="main.js"
              :rows="12"
              class="w-full"
            />

            <div class="grid gap-3" v-if="result || error">
              <div v-if="error" role="alert" class="alert-error">
                {{ error }}
              </div>
              <ExecutionOutput v-if="result" :result="result" />
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                :disabled="running || !localCode.trim()"
                class="btn-secondary"
                @click="handleCodeExecution"
              >
                {{ running ? 'Exécution en cours…' : 'Exécuter' }}
              </button>

              <button
                type="button"
                :disabled="running"
                class="btn-outline"
                @click="localCode.value = ''; result.value = null; error.value = ''"
              >
                Effacer
              </button>

              <!-- Button to continue even if exercise not validated -->
              <button
                v-if="result === false || error !== ''"
                type="button"
                class="btn-outline"
                @click="goToNextStep"
              >
                Continuer malgré l'échec
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="grid gap-4 mt-8">
      <div class="flex justify-between">
        <button
          v-if="!isFirstStep"
          type="button"
          class="btn-outline"
          @click="goToPreviousStep"
        >
          Étape précédente
        </button>

        <div class="flex justify-end gap-3">
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
            @click="handleSubmit"
          >
            {{ isSubmitting ? 'Soumission en cours…' : 'Terminer le questionnaire' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>