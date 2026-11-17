<script setup lang="ts">
const props = defineProps<{ items: readonly Crumb[] }>()

// La derniere etape est la page affichee : signalee comme telle meme hors de sa route exacte.
const links = computed(() =>
  props.items.map((item, index) => ({ ...item, active: index === props.items.length - 1 })),
)
</script>

<template>
  <div class="border-default bg-elevated/50 min-w-0 rounded-md border px-3 py-1.5">
    <UBreadcrumb
      :items="links"
      separator-icon="i-lucide-chevron-right"
      aria-label="Fil d’Ariane"
      :ui="{ link: 'underline underline-offset-4' }"
    />
  </div>
</template>
