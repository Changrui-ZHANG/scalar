// Code MongoDB d'une violation d'index unique, et la lecture de ce code sur
// une erreur du pilote. Partage par `quota.service.ts` et
// `submission.service.ts`, les deux seuls ecrivains qui traduisent cette
// violation en succes idempotent plutot qu'en erreur interne. Ne remplace pas
// la copie deja presente dans `auth.service.ts` — plus ancienne, laissee
// telle quelle.
export const DUPLICATE_KEY_CODE = 11000

export function mongoErrorCode(erreur: unknown): number | undefined {
  return typeof erreur === 'object' && erreur !== null && 'code' in erreur
    ? Number((erreur as { code: unknown }).code)
    : undefined
}
