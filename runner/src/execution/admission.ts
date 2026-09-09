// Decide l'admission (AD-26) : le runner seul connait sa charge reelle. Au
// plafond, un depot n'est jamais refuse — il obtient une place en file,
// prise dans l'ordre, et l'execution demarre reellement des qu'un jeton se
// libere. `essayer` ne bloque jamais : la decision est immediate, et
// l'attente eventuelle est une promesse que l'appelant peut ignorer sans
// retenir la reponse HTTP.
export type DecisionAdmission =
  | { readonly admis: true; readonly attendreTour: Promise<void> }
  | { readonly admis: false; readonly position: number; readonly attendreTour: Promise<void> }

export class Admission {
  private jetonsLibres: number
  private readonly enAttente: Array<() => void> = []

  constructor(plafond: number) {
    if (plafond < 1) {
      throw new Error('Le plafond de concurrence du runner doit valoir au moins 1.')
    }

    this.jetonsLibres = plafond
  }

  essayer(): DecisionAdmission {
    if (this.jetonsLibres > 0) {
      this.jetonsLibres -= 1

      return { admis: true, attendreTour: Promise.resolve() }
    }

    const position = this.enAttente.length + 1
    const attendreTour = new Promise<void>((resoudre) => {
      this.enAttente.push(resoudre)
    })

    return { admis: false, position, attendreTour }
  }

  // A appeler une fois, exactement, quand l'execution correspondant a un
  // jeton pris par `essayer` est terminee — succes, echec ou depassement de
  // duree, peu importe. Le jeton libere est transmis directement au premier
  // en attente (jamais remis au pool commun puis redispute) : c'est ce qui
  // rend la file FIFO plutot qu'une course.
  liberer(): void {
    const suivant = this.enAttente.shift()

    if (suivant) {
      suivant()

      return
    }

    this.jetonsLibres += 1
  }

  get nombreEnAttente(): number {
    return this.enAttente.length
  }
}
