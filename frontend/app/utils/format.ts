// Petites fonctions de mise en forme des textes affichés.

// Nombre suivi du mot au singulier ou au pluriel : « 1 chapitre », « 13 chapitres ».
export function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `${count} ${singular}`
  }
  return `${count} ${plural}`
}
