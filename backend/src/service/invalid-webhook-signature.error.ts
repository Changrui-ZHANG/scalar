export class InvalidWebhookSignatureError extends Error {
  constructor(cause?: unknown) {
    super('Signature du webhook Stripe invalide', { cause })
    this.name = 'InvalidWebhookSignatureError'
  }
}
