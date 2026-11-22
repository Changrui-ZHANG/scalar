<script setup lang="ts">
useSeoMeta({ title: 'Tableau de bord — Backoffice Scalar' })

const store = useAccountsStore()
await store.loadMetrics()

const tiles = computed(() => {
  const m = store.metrics
  return m
    ? [
        {
          label: 'Apprenants',
          hint: 'anonymes compris',
          value: m.learners,
          icon: 'i-lucide-users',
        },
        {
          label: 'Inscrits',
          hint: 'avec un compte',
          value: m.registered,
          icon: 'i-lucide-user-check',
        },
        { label: 'Premium', hint: 'abonnements en cours', value: m.premium, icon: 'i-lucide-gem' },
        {
          label: 'Exercices tentés',
          hint: 'par apprenant et par exercice',
          value: m.attemptedExercises,
          icon: 'i-lucide-code',
        },
        {
          label: 'Exercices réussis',
          hint: 'par apprenant et par exercice',
          value: m.passedExercises,
          icon: 'i-lucide-circle-check',
        },
        { label: 'Certificats', hint: 'délivrés', value: m.certificates, icon: 'i-lucide-award' },
      ]
    : []
})

const subscriptions = computed(() =>
  (['active', 'past_due', 'canceled'] as const).map((status) => ({
    status,
    label: SUBSCRIPTION_FILTERS.find((f) => f.value === status)!.label,
    count: store.metrics?.subscriptions[status] ?? 0,
  })),
)
</script>

<template>
  <UDashboardPanel id="tableau-de-bord">
    <template #header>
      <UDashboardNavbar title="Tableau de bord" />
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UCard v-for="tile in tiles" :key="tile.label" :data-metric="tile.label">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-muted text-sm">{{ tile.label }}</p>
              <p class="text-3xl font-semibold tabular-nums">{{ tile.value }}</p>
              <p class="text-dimmed text-xs">{{ tile.hint }}</p>
            </div>
            <UIcon :name="tile.icon" class="text-muted size-6" />
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Abonnements</h2>
        </template>
        <ul class="grid gap-2 sm:grid-cols-3">
          <li v-for="s in subscriptions" :key="s.status">
            <ULink
              :to="`/utilisateurs?subscription=${s.status}`"
              class="border-default flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span>{{ s.label }}</span>
              <span class="font-semibold tabular-nums">{{ s.count }}</span>
            </ULink>
          </li>
        </ul>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
