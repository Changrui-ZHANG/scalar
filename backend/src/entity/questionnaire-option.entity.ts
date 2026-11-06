export interface QuestionnaireOption {
  id: number
  questionId: number
  position: number
  label: string
  // Entre 0 et 1. Jamais renvoye au navigateur : il donnerait la bonne reponse.
  score: number
  trackSlug: string | null
  createdAt: Date
  updatedAt: Date
}
