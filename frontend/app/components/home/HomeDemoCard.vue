<script setup lang="ts">
/** Carte de démonstration décorative statique (§ 4.1) */
</script>

<template>
  <div
    aria-hidden="true"
    class="w-full max-w-[500px] select-none rounded-[14px] border border-border bg-surface p-5 shadow-[0_18px_40px_rgb(34_32_27_/_8%)] dark:shadow-none"
  >
    <!-- Barre haute avec onglets factices -->
    <div class="mb-4 flex items-center justify-between border-b border-border pb-3">
      <div class="flex items-center gap-3 text-xs font-semibold">
        <span class="text-text-muted">Consigne</span>
        <span class="text-text-muted">Leçon</span>
        <span class="text-primary border-b-2 border-primary pb-3 -mb-3">main.js</span>
      </div>
      <span class="text-xs font-mono text-text-muted">JavaScript</span>
    </div>

    <!-- Code factice isEven -->
    <pre class="mb-4 rounded-[10px] bg-code-bg p-3.5 font-mono text-xs leading-relaxed text-code-text"><code><span class="text-code-keyword">function</span> <span class="text-code-function">isEven</span>(n) {
  <span class="text-code-keyword">return</span> n % <span class="text-code-string">2</span> === <span class="text-code-string">0</span>
}</code></pre>

    <!-- Résultat des tests -->
    <div class="flex items-center justify-between rounded-[10px] bg-success-soft px-3.5 py-2 text-xs font-semibold text-success">
      <div class="flex items-center gap-2">
        <Icon name="lucide:circle-check" class="size-4 shrink-0" />
        <span>3 cas sur 3 réussis</span>
      </div>
      <span class="font-mono text-[11px]">12 ms</span>
    </div>
  </div>
</template>
