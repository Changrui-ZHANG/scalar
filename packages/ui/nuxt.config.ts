// packages/ui/nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/fonts'],
  fonts: {
    families: [
      { name: 'Fraunces', weights: [600] },
      { name: 'Source Sans 3', weights: [400, 500, 600, 700] },
      { name: 'Fira Code', weights: [400, 500] },
    ],
  },
})
