// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Les contrats sont le seul code du depot que les deux autres espaces lisent :
// une erreur y voyage partout. Configuration minimale et sans verification de
// types — `tsc --noEmit` la fait deja, avec `erasableSyntaxOnly` en plus.
//
// Aucune regle refusant une interface de reponse ici : c'est precisement
// l'endroit ou elle doit se declarer. La regle symetrique vit dans
// `frontend/eslint.config.mjs`.
export default tseslint.config(js.configs.recommended, tseslint.configs.recommended)
