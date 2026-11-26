// Compte connecté, tel que le renvoient /auth/login, /auth/register et /auth/me.
export interface Account {
  readonly id: string
  readonly email: string
  readonly role: 'learner' | 'admin'
}

export interface Credentials {
  readonly email: string
  readonly password: string
}

// Un exercice tenté, dans GET /learners/:id/progress.
export interface LearnerExercise {
  readonly track: string
  readonly chapter: string
  readonly exercise: string
  readonly title: string
  readonly attempts: number
  readonly passed: boolean
  readonly firstPassedAt: string | null
  readonly lastAttemptAt: string
}

// Une leçon terminée, dans GET /learners/:id/progress.
export interface LearnerLesson {
  readonly track: string
  readonly chapter: string
  readonly lesson: string
  readonly title: string
  readonly completedAt: string
}

// Progression enregistrée par le serveur. Seuls les champs lus par le site sont décrits.
export interface LearnerProgress {
  readonly passedCount: number
  readonly exercises: readonly LearnerExercise[]
  readonly lessons: readonly LearnerLesson[]
}
