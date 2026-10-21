<script setup lang="ts">
interface Props {
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  accept: []
  dismiss: []
}>()
</script>

<template>
  <UiDialog
    :open="open"
    title="Remplacer le code du bac à sable ?"
    @update:open="(val) => { if (!val) emit('dismiss') }"
  >
    <div class="p-6 flex flex-col gap-4">
      <h3 class="font-display text-lg font-bold text-text">
        Remplacer le code du bac à sable ?
      </h3>
      <p class="text-sm text-text-muted">
        Le bac à sable contient déjà du code. Voulez-vous le remplacer par l'exemple de la leçon ?
      </p>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <UiButton
          variant="secondary"
          dense
          @click="emit('dismiss')"
        >
          Annuler
        </UiButton>
        <UiButton
          variant="primary"
          dense
          @click="emit('accept')"
        >
          Remplacer
        </UiButton>
      </div>
    </div>
  </UiDialog>
</template>
