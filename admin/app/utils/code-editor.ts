import { javascript, javascriptLanguage, scopeCompletionSource } from '@codemirror/lang-javascript'
import type { Extension } from '@codemirror/state'

// Le code de l'apprenant tourne sous Node (Piston) : pas `globalThis`, qui
// proposerait `document`, `window` et le reste du navigateur de l'admin.
const NODE_STANDARD_SCOPE = {
  Array,
  Boolean,
  console,
  Date,
  Error,
  isNaN,
  JSON,
  Map,
  Math,
  Number,
  Object,
  parseFloat,
  parseInt,
  Promise,
  RegExp,
  Set,
  String,
  Symbol,
}

export function codeLanguageExtension(language: 'javascript' | 'typescript'): Extension {
  return [
    javascript({ typescript: language === 'typescript' }),
    javascriptLanguage.data.of({ autocomplete: scopeCompletionSource(NODE_STANDARD_SCOPE) }),
  ]
}
