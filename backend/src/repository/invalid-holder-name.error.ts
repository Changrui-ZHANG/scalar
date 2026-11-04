/** Nom vide sur un certificat : refusé en mémoire comme par le contrôle CHECK de la base. */
export class InvalidHolderNameError extends Error {
  constructor() {
    super('Le nom du titulaire du certificat est vide.')
    this.name = 'InvalidHolderNameError'
  }
}
