// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // Prettier ecrit `<img />` : sans cela, ESLint et Prettier se contredisent sur les elements vides.
  rules: { 'vue/html-self-closing': ['warn', { html: { void: 'always' } }] },
})
