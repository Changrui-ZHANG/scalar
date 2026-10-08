<script setup lang="ts">
/**
 * Cas de test d'un exercice, saisis en JSON. A placer dans un `UForm` : les
 * erreurs s'affichent sous chaque champ (`testCases.0.args`...).
 */
const cases = defineModel<TestCaseInput[]>({ required: true })

defineProps<{ functionName: string }>()

const EMPTY: TestCaseInput = { args: '[]', expected: '', label: '', isHidden: false }

const update = (index: number, patch: Partial<TestCaseInput>) => {
  cases.value = cases.value.map((c, i) => (i === index ? { ...c, ...patch } : c))
}
const add = () => {
  cases.value = [...cases.value, { ...EMPTY }]
}
const remove = (index: number) => {
  cases.value = cases.value.filter((_, i) => i !== index)
}
</script>

<template>
  <UFormField
    name="testCases"
    label="Cas de test"
    required
    :help="`Chaque cas appelle ${functionName || 'la fonction'}(...args) et compare le résultat à la valeur attendue.`"
  >
    <ol class="grid gap-3">
      <li
        v-for="(testCase, i) in cases"
        :key="i"
        class="border-default grid gap-3 rounded-lg border p-4 sm:grid-cols-2"
      >
        <UFormField :name="`testCases.${i}.args`" :label="`Cas ${i + 1} · arguments (JSON)`">
          <UInput
            :model-value="testCase.args"
            placeholder="[2, 3]"
            class="w-full font-mono"
            @update:model-value="update(i, { args: String($event) })"
          />
        </UFormField>
        <UFormField :name="`testCases.${i}.expected`" label="Résultat attendu (JSON)">
          <UInput
            :model-value="testCase.expected"
            placeholder="5"
            class="w-full font-mono"
            @update:model-value="update(i, { expected: String($event) })"
          />
        </UFormField>
        <UFormField :name="`testCases.${i}.label`" label="Libellé (facultatif)">
          <UInput
            :model-value="testCase.label"
            placeholder="nombres négatifs"
            class="w-full"
            @update:model-value="update(i, { label: String($event) })"
          />
        </UFormField>
        <div class="flex items-end justify-between gap-3">
          <UCheckbox
            :model-value="testCase.isHidden"
            label="Caché à l’apprenant"
            @update:model-value="update(i, { isHidden: $event === true })"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            :aria-label="`Supprimer le cas ${i + 1}`"
            @click="remove(i)"
          />
        </div>
      </li>
    </ol>
    <UButton
      class="mt-3"
      icon="i-lucide-plus"
      color="neutral"
      variant="outline"
      label="Ajouter un cas"
      @click="add"
    />
  </UFormField>
</template>
