/** Refus d'une verification en temps reel : le meme statut et le meme message que la route HTTP. */
export class RealtimeRefusal extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RealtimeRefusal'
    this.status = status
  }
}
