<script setup lang="ts">
// Carte de démonstration de l'accueil (specs-site.md § 4.1) : purement décorative,
// statique, cachée aux lecteurs d'écran. Seule carte du site avec une ombre.
</script>

<template>
  <div
    aria-hidden="true"
    class="rounded-panel border-border bg-surface shadow-demo w-full shrink-0 overflow-hidden border select-none xl:w-125"
  >
    <!-- Onglets factices -->
    <div class="border-border flex gap-4.5 border-b px-4.5 pt-3">
      <span class="text-small text-text-muted pb-2.5 font-medium">Consigne</span>
      <span class="text-small text-text-muted pb-2.5 font-medium">Leçon</span>
      <span class="border-primary text-small text-text border-b-2 pb-2.5 font-semibold"
        >main.js</span
      >
    </div>

    <!-- Code factice -->
    <div class="bg-code-bg text-code-text flex flex-col gap-1.5 px-4.5 py-4 font-mono text-sm">
      <p>
        <span class="text-code-keyword">function </span>
        <span class="text-code-function">isEven</span>
        <span>(n) {</span>
      </p>
      <p class="pl-4"><span class="text-code-keyword">return </span>n % 2 === 0</p>
      <p>}</p>
    </div>

    <!-- Résultat factice -->
    <div class="flex flex-col gap-2 px-4.5 py-3.5">
      <p class="text-label text-success flex items-center gap-2 font-bold">
        <Icon name="lucide:circle-check" class="size-4.5" />
        3 cas sur 3 réussis
      </p>
      <p class="text-meta text-text flex items-center gap-2 font-mono">
        <Icon name="lucide:check" class="text-success size-3.5" />
        isEven(4)
        <Icon name="lucide:arrow-right" class="text-text-muted size-3" />
        true
      </p>
      <p class="text-meta text-text flex items-center gap-2 font-mono">
        <Icon name="lucide:check" class="text-success size-3.5" />
        isEven(7)
        <Icon name="lucide:arrow-right" class="text-text-muted size-3" />
        false
      </p>
    </div>
  </div>
</template>
