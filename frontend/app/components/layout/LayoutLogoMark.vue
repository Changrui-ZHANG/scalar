<script setup lang="ts">
// Symbole du logo (charte.md § 1), dessiné dans la page plutôt que par <img> :
// une image ne reçoit pas la couleur du texte, le SVG en ligne si (currentColor).
// - tablet : 3 carrés emboîtés (en-tête du site)
// - mobile : 2 carrés (barres mobiles)
interface Props {
  variant?: 'tablet' | 'mobile'
}

const { variant = 'tablet' } = defineProps<Props>()
</script>

<template>
  <svg viewBox="0 0 160 160" fill="none" aria-hidden="true" class="text-primary">
    <template v-if="variant === 'tablet'">
      <rect
        x="25.5"
        y="25.5"
        width="109"
        height="109"
        rx="22"
        stroke="currentColor"
        stroke-width="11"
      />
      <rect
        x="25.5"
        y="61.5"
        width="73"
        height="73"
        rx="16"
        stroke="currentColor"
        stroke-width="11"
      />
      <rect x="20" y="92" width="48" height="48" rx="10" fill="currentColor" />
    </template>
    <template v-else>
      <rect
        x="22"
        y="22"
        width="116"
        height="116"
        rx="28"
        stroke="currentColor"
        stroke-width="16"
      />
      <rect x="41" y="79" width="46" height="46" rx="9" fill="currentColor" />
    </template>
  </svg>
</template>
