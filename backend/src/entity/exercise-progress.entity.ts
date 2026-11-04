export interface ExerciseProgress {
  userId: string
  exerciseId: number
  attempts: number
  // Exercice reussi si et seulement si non nul.
  firstPassedAt: Date | null
  lastAttemptAt: Date
}
