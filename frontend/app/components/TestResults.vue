<script setup lang="ts">
/** Verdict de la verification, critere par critere : symbole et texte, jamais la couleur seule. */
const props = defineProps<{ verification: VerificationResult }>()

const summary = computed(() => {
  const { passedCount, total } = props.verification
  return `${passedCount} ${passedCount > 1 ? 'tests réussis' : 'test réussi'} sur ${total}`
})
</script>

<template>
  <section class="card grid gap-3 p-5">
    <h3 class="text-lg font-semibold">{{ summary }}</h3>
    <ul class="grid gap-2">
      <li v-for="(check, i) in verification.checks" :key="i" class="flex gap-3">
        <span
          aria-hidden="true"
          class="grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold"
          :class="check.passed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'"
        >
          {{ check.passed ? '✓' : '×' }}
        </span>
        <span class="grid gap-0.5">
          <span>
            <span class="sr-only">{{ check.passed ? 'Réussi : ' : 'Échoué : ' }}</span>
            {{ check.label }}
          </span>
          <span v-if="check.detail" class="text-body-sm text-muted-foreground break-words">
            {{ check.detail }}
          </span>
        </span>
      </li>
    </ul>
    <p v-if="!verification.passed" class="text-muted-foreground border-t pt-3">
      Modifiez le code puis relancez la vérification.
    </p>
  </section>
</template>
