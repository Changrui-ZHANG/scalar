// types/exercise.ts : états d'écran de l'exercice (§ 7.1 à § 7.4)
export type ExerciseTab = 'instructions' | 'lesson' | 'hints' // colonne Consigne ; ne change pas l'URL
export type ResultTab = 'tests' | 'console'
export type MobileExerciseTab = 'instructions' | 'lesson' | 'code' | 'result'
export type RunPending = 'run' | 'verify' | null // « Exécution… » / « Vérification… »
export type DraftStatus = 'idle' | 'saved' | 'failed' // idle : rien modifié ; « Brouillon enregistré » ; « Brouillon non enregistré : … »
