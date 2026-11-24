<script setup lang="ts">
// « Remplacer le code du bac à sable ? » (specs-site.md § 8) : demandé quand « Essayer dans
// le bac à sable » arrive alors que le bac à sable contient déjà un autre code.
interface Props {
  open: boolean
}

const { open } = defineProps<Props>()

const emit = defineEmits<{
  accept: []
  dismiss: []
}>()

// Fermer le dialogue (Échap, voile) revient à « Annuler ».
function onOpenChange(isOpen: boolean) {
  if (!isOpen) {
    emit('dismiss')
  }
}
</script>

<template>
  <UiDialog :open="open" title="Remplacer le code du bac à sable ?" @update:open="onOpenChange">
    <p class="text-text-muted text-sm">
      Le bac à sable contient déjà du code. Il sera remplacé par l’exemple choisi.
    </p>
    <template #actions>
      <UiButton dense variant="secondary" @click="emit('dismiss')">Annuler</UiButton>
      <UiButton dense @click="emit('accept')">Remplacer</UiButton>
    </template>
  </UiDialog>
</template>
