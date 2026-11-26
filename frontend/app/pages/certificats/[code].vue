<script setup lang="ts">
// Vérification publique d'un certificat : n'importe qui avec le lien peut voir
// qu'il est authentique. Code inconnu : page introuvable.
import type { Certificate } from '~/types/certificate'
import { usePageSeo } from '~/composables/usePageSeo'
import { fetchCertificate } from '~/services/certificates'
import { formatLongDate } from '~/utils/formatDate'
import { toPageError } from '~/utils/pageError'

definePageMeta({ layout: 'default' })

const route = useRoute()
const code = String(route.params.code ?? '')

const { data, error } = await useAsyncData<Certificate>(`certificate:${code}`, () =>
  fetchCertificate(code),
)
if (error.value) throw toPageError(error.value)

const certificate = computed(() => data.value!)

usePageSeo({
  title: ['Certificat', certificate.value.track?.name ?? 'Scalar'],
  description: `Certificat Scalar de ${certificate.value.holderName}.`,
  type: 'website',
})
</script>

<template>
  <div class="flex justify-center px-4 py-14 md:py-20">
    <article
      class="border-border bg-surface rounded-card flex w-full max-w-xl flex-col items-center gap-5 border px-6 py-10 text-center md:px-10"
    >
      <span class="bg-success-soft text-success text-tag inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold">
        <Icon name="lucide:badge-check" class="size-3.5" />
        Certificat authentique
      </span>

      <Icon name="lucide:award" class="text-primary size-12" />

      <div class="flex flex-col gap-2">
        <p class="text-ui text-text-muted">Scalar certifie que</p>
        <h1 class="font-display text-text text-3xl font-semibold md:text-4xl">
          {{ certificate.holderName }}
        </h1>
        <p class="text-body text-text-muted">
          a terminé le parcours
          <strong class="text-text">{{ certificate.track?.name ?? 'retiré depuis' }}</strong>
          et réussi tous ses exercices.
        </p>
      </div>

      <p class="text-small text-text-muted">
        Délivré le {{ formatLongDate(certificate.issuedAt) }} · code {{ certificate.code }}
      </p>

      <UiButton
        v-if="certificate.track"
        variant="secondary"
        dense
        :to="`/parcours/${certificate.track.slug}`"
      >
        Découvrir le parcours
      </UiButton>
    </article>
  </div>
</template>
