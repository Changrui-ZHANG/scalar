<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSeoMeta } from '#imports'
import { useExecution } from '@/composables/useExecution'
import BreadcrumbTrail from '@/components/BreadcrumbTrail.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import ExecutionOutput from '@/components/ExecutionOutput.vue'
import ProgressBar from '@/components/ProgressBar.vue'

useSeoMeta({
  title: 'Démarrer — Scalar',
  description: 'Questionnaire d\'évaluation pour déterminer votre niveau de départ',
})

// Questionnaire data
const questions = ref([
  {
    id: 1,
    type: 'multiple-choice',
    title: 'Évaluez votre expérience avec la programmation',
    description: 'Quel est votre niveau actuel en programmation ?',
    options: [
      { label: 'Débutant absolu (aucune expérience)', value: 'beginner' },
      { label: 'Débutant (quelques bases)', value: 'novice' },
      { label: 'Intermédiaire (expérience pratique)', value: 'intermediate' },
      { label: 'Avancé (expérience professionnelle)', value: 'advanced' },
      { label: 'Expert (maîtrise plusieurs langages)', value: 'expert' }
    ]
  },
  {
    id: 2,
    type: 'multiple-choice',
    title: 'Quels langages de programmation connaissez-vous ?',
    description: 'Sélectionnez tous ceux que vous avez utilisés',
    options: [
      { label: 'JavaScript / TypeScript', value: 'js' },
      { label: 'Python', value: 'python' },
      { label: 'Java', value: 'java' },
      { label: 'C / C++', value: 'cpp' },
      { label: 'Go', value: 'go' },
      { label: 'Rust', value: 'rust' },
      { label: 'Autre', value: 'other' }
    ],
    multiple: true
  },
  {
    id: 3,
    type: 'text',
    title: 'Pourquoi voulez-vous apprendre le développement web ?',
    description: 'Décrivez brièvement vos motivations et objectifs',
    placeholder: 'Ex: Je veux créer des sites web pour mon entreprise, devenir développeur freelance, etc.'
  },
  {
    id: 4,
    type: 'code',
    title: 'Premier exercice de code',
    description: 'Écrivez une fonction qui retourne la somme de deux nombres',
    placeholder: '// Écrivez votre code ici\nfunction somme(a, b) {\n  return a + b\n}\n\nconsole.log(somme(2, 3))',
    example: '// Le résultat affiché est ce que le script écrit sur la sortie standard.\nfunction addition(a, b) {\n  return a + b\n}\n\nconsole.log(addition(2, 3))'
  },
  {
    id: 5,
    type: 'code',
    title: 'Exercice de manipulation de chaînes',
    description: 'Écrivez une fonction qui retourne la longueur d\'une chaîne de caractères',
    placeholder: '// Écrivez votre code ici\nfunction longueurChaine(str) {\n  return str.length\n}\n\nconsole.log(longueurChaine("Bonjour"))',
    example: '// Compter les caractères d\'une chaîne\nfunction strlen(str) {\n  let count = 0\n  for (let i = 0; i < str.length; i++) {\n    count++\n  }\n  return count\n}\n\nconsole.log(strlen("Hello World"))'
  }
])

// State
const currentStep = ref(0)
const answers = ref({})
const { result, error, running, run } = useExecution()
const localCode = ref('')

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

// Computed properties
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

// Navigation functions
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

// Code execution handler
async function handleCodeExecution() {
  if (!localCode.value.trim()) return
  await run(localCode.value)
}

// Reset form
function resetForm() {
  currentStep.value = 0
  answers.value = {}
  localCode.value = ''
}
</script>

<template>
  <div class="grid gap-8 py-10">
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
            @click="resetForm"
          >
            Terminer le questionnaire
          </button>
        </div>
      </div>
    </div>
  </div>
</template>