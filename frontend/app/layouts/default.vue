<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b">
      <nav class="max-w-content mx-auto flex items-center justify-between p-4">
        <NuxtLink to="/" class="font-display text-title">Scalar</NuxtLink>
        <NuxtLink to="/exercices" class="text-title">Exercices</NuxtLink>
      </nav>
    </header>

    <main class="max-w-content mx-auto w-full flex-1 p-4">
      <slot />
    </main>

    <footer class="border-t">
      <div class="max-w-content text-body-sm text-muted-foreground mx-auto p-4">Scalar</div>
    </footer>
  </div>
</template>
