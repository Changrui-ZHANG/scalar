<script setup lang="ts">
// Certificat de fin de parcours, sur la vue d'ensemble : proposé une fois tous les
// exercices du parcours réussis. Le serveur revérifie tout avant de le délivrer.
import type { TrackView } from '@scalar/shared/api'
import type { Certificate } from '~/types/certificate'
import { issueCertificate } from '~/services/certificates'
import { readLearnerId } from '~/services/learnerId'
import { fetchLearnerProgress } from '~/services/learners'
import { useAuthStore } from '~/stores/auth'
import { apiErrorMessage, apiErrorStatus } from '~/utils/apiError'
import { exerciseKey } from '~/utils/track'

interface Props {
  track: TrackView
  completed: ReadonlySet<string>
}

const { track, completed } = defineProps<Props>()

const auth = useAuthStore()

const certificate = ref<Certificate | null>(null)
const holderName = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
// Refus du serveur faute d'abonnement : on montre alors le lien vers l'offre.
const needsPremium = ref(false)

// Tous les exercices du parcours sont réussis dans ce navigateur.
const allExercisesDone = computed(() => {
  let count = 0
  for (const chapter of track.chapters) {
    for (const exercise of chapter.exercises) {
      count += 1
      if (!completed.has(exerciseKey(chapter.slug, exercise.slug))) return false
    }
  }
  // Un parcours sans exercice (Conception) n'a pas de certificat.
  return count > 0
})

// Le compte connecté, sinon l'apprenant anonyme de ce navigateur.
function learnerId(): string | null {
  return auth.account?.id ?? readLearnerId()
}

// Certificat déjà délivré pour ce parcours ?
async function loadExisting() {
  const id = learnerId()
  if (!id || !allExercisesDone.value) return
  try {
    const progress = await fetchLearnerProgress(id)
    certificate.value = progress.certificates.find((c) => c.track?.slug === track.track.slug) ?? null
  } catch {
    // Illisible : le formulaire reste proposé, le serveur renverra le certificat existant.
  }
}

async function onSubmit() {
  const id = learnerId()
  if (!id) return
  error.value = null
  needsPremium.value = false
  loading.value = true
  try {
    certificate.value = await issueCertificate(id, track.track.slug, holderName.value.trim())
  } catch (err) {
    error.value = apiErrorMessage(err, 'Le certificat n’a pas pu être délivré. Réessayez.')
    needsPremium.value = apiErrorStatus(err) === 403 && /Premium/.test(error.value)
  } finally {
    loading.value = false
  }
}

watch(
  () => [auth.loaded, auth.account?.id, allExercisesDone.value],
  () => {
    if (auth.loaded) loadExisting()
  },
  { immediate: true },
)
</script>

<template>
  <section
    v-if="allExercisesDone"
    aria-labelledby="certificate-title"
    class="border-border bg-surface rounded-card flex flex-col gap-4 border p-5"
  >
    <div class="flex items-center gap-2.5">
      <Icon name="lucide:award" class="text-primary size-5.5" />
      <h2 id="certificate-title" class="font-display text-text text-lg font-semibold">
        Certificat de fin de parcours
      </h2>
    </div>

    <template v-if="certificate">
      <p class="text-ui text-text-muted">
        Délivré à {{ certificate.holderName }}. Partagez son adresse : n’importe qui peut le
        vérifier.
      </p>
      <UiButton :to="`/certificats/${certificate.code}`" dense icon-right="lucide:arrow-right">
        Voir mon certificat
      </UiButton>
    </template>

    <template v-else-if="auth.loaded && learnerId()">
      <p class="text-ui text-text-muted">
        Tous les exercices sont réussis. Indiquez le nom à faire figurer sur le certificat.
      </p>
      <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1.5">
          <span class="text-ui text-text font-semibold">Nom sur le certificat</span>
          <input
            v-model="holderName"
            type="text"
            name="holderName"
            autocomplete="name"
            maxlength="100"
            required
            class="rounded-control border-border bg-surface text-text focus:border-primary h-11 border px-3.5 outline-none"
          >
        </label>
        <p
          v-if="error"
          role="alert"
          class="bg-danger-soft text-danger text-small rounded-row px-3.5 py-2.5 font-medium"
        >
          {{ error }}
          <NuxtLink v-if="needsPremium" to="/premium" class="underline">Voir l’offre Premium</NuxtLink>
        </p>
        <UiButton
          type="submit"
          dense
          :disabled="holderName.trim() === ''"
          :loading="loading"
          loading-label="Délivrance…"
        >
          Obtenir mon certificat
        </UiButton>
      </form>
    </template>

    <p v-else-if="auth.loaded" class="text-ui text-text-muted">
      <NuxtLink to="/inscription" class="text-primary font-semibold hover:underline">
        Créez un compte
      </NuxtLink>
      pour recevoir votre certificat.
    </p>
  </section>
</template>
