/** Ligne liée introuvable : apprenant, exercice ou parcours qui n'existe pas. */
export class UnknownReferenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'UnknownReferenceError'
  }
}
