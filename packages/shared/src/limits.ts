// limits.ts : seule source des limites (jamais un nombre en dur, specs-backend.md § 5.4)
// Longueurs en caractères (string.length) ; tailles en octets.
export const MAX_CODE_BYTES = 65_536 // code soumis (exécuter, vérifier), octets UTF-8 : 64 Kio
export const MAX_REQUEST_BODY_BYTES = 262_144 // corps JSON de l'API (express.json) : 256 Kio
export const MAX_SLUG_LENGTH = 80 // suffixe -2, -3… compris
export const MAX_TRACK_NAME_LENGTH = 60
export const MAX_TRACK_SUMMARY_LENGTH = 300
export const MAX_CHAPTER_TITLE_LENGTH = 120
export const MAX_CHAPTER_SUMMARY_LENGTH = 500
export const MAX_LESSON_TITLE_LENGTH = 120 // « titre (copie) » compris
export const MAX_LESSON_SUMMARY_LENGTH = 300
export const MAX_LESSON_BODY_LENGTH = 20_000
export const MAX_EXERCISE_TITLE_LENGTH = 120 // « titre (copie) » compris
export const MAX_EXERCISE_INSTRUCTIONS_LENGTH = 5_000
export const MAX_HINTS = 3
export const MAX_HINT_LENGTH = 500
export const MAX_FUNCTION_NAME_LENGTH = 60
export const MAX_EXERCISE_CODE_LENGTH = 5_000 // code de départ, solution
export const MAX_TEST_CASES = 20 // cas actifs d'un exercice
export const MAX_CASE_JSON_BYTES = 1_024 // arguments, expectedResult, chacun écrit en JSON
export const MAX_TEST_CASE_DESCRIPTION_LENGTH = 80
export const MAX_DISPLAYED_VALUE_BYTES = 2_048 // valeur obtenue (actual) écrite en JSON ; au-delà : null + « Valeur trop longue pour être affichée. »
export const MAX_HIGHLIGHT_BLOCKS = 50 // blocs par requête POST /api/highlight (§ 3.1)
export const MAX_HIGHLIGHT_BYTES = 204_800 // corps de POST /api/highlight : 200 Kio
