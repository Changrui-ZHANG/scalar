<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

useSeoMeta({ title: 'Utilisateurs — Backoffice Scalar' })

const route = useRoute()
const store = useAccountsStore()

const query = computed(() => toAccountQuery(route.query))
const search = ref(query.value.email ?? '')

await store.loadUsers(query.value)
// Meme page, autre adresse : recherche ou filtre changes.
watch(query, (next) => store.loadUsers(next))

function onSearch() {
  const email = search.value.trim()
  return navigateTo(
    `/utilisateurs${accountSearch({ ...(email ? { email } : {}), subscription: query.value.subscription })}`,
  )
}

const filterLink = (value: SubscriptionFilter | undefined) =>
  `/utilisateurs${accountSearch({ email: query.value.email, subscription: value })}`

const columns: TableColumn<AdminAccount>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Rôle' },
  { accessorKey: 'createdAt', header: 'Inscrit le' },
  { accessorKey: 'premium', header: 'Premium' },
  { id: 'subscription', header: 'Abonnement' },
  { id: 'plan', header: 'Formule' },
  { id: 'periodEnd', header: 'Fin de période' },
]
</script>

<template>
  <UDashboardPanel id="utilisateurs">
    <template #header>
      <UDashboardNavbar title="Utilisateurs" />
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <form class="flex gap-2" role="search" @submit.prevent="onSearch">
          <UInput
            v-model="search"
            type="search"
            icon="i-lucide-search"
            placeholder="Chercher un email"
            aria-label="Chercher un email"
          />
          <UButton type="submit" label="Rechercher" color="neutral" variant="outline" />
        </form>
        <nav aria-label="Filtrer par abonnement" class="flex flex-wrap gap-1">
          <UButton
            v-for="filter in SUBSCRIPTION_FILTERS"
            :key="filter.label"
            :label="filter.label"
            :to="filterLink(filter.value)"
            size="sm"
            :color="query.subscription === filter.value ? 'primary' : 'neutral'"
            :variant="query.subscription === filter.value ? 'solid' : 'ghost'"
          />
        </nav>
      </div>

      <p class="text-muted text-sm">
        {{ store.total }} {{ store.total > 1 ? 'comptes' : 'compte' }}
        <template v-if="store.users.length < store.total">
          (les {{ store.users.length }} plus récents affichés)
        </template>
      </p>

      <UTable :data="[...store.users]" :columns="columns" empty="Aucun compte.">
        <template #role-cell="{ row }">
          <UBadge
            :label="ROLE_LABELS[row.original.role]"
            :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
          />
        </template>
        <template #createdAt-cell="{ row }">
          <span class="tabular-nums">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #premium-cell="{ row }">
          <UBadge
            :label="row.original.premium ? 'Oui' : 'Non'"
            :color="row.original.premium ? 'success' : 'neutral'"
            variant="subtle"
          />
        </template>
        <template #subscription-cell="{ row }">
          {{
            row.original.subscription
              ? SUBSCRIPTION_LABELS[row.original.subscription.status]
              : NO_SUBSCRIPTION_LABEL
          }}
        </template>
        <template #plan-cell="{ row }">
          {{ row.original.subscription ? PLAN_LABELS[row.original.subscription.plan] : '—' }}
        </template>
        <template #periodEnd-cell="{ row }">
          <span class="tabular-nums">
            {{
              row.original.subscription
                ? formatDate(row.original.subscription.currentPeriodEnd)
                : '—'
            }}
          </span>
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
