export interface LessonProgress {
  userId: string
  lessonId: number
  // Premiere fin de lecture : relire la lecon ne la deplace pas.
  completedAt: Date
}
