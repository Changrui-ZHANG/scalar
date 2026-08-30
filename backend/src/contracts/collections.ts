// Table normative des collections, reprise du §Propriete des collections de
// l'epine. AD-2 s'y adosse : une collection absente d'ici n'existe pas, et un
// seul module en detient l'ecriture.
//
// Le vocabulaire est celui du Glossaire du PRD : anglais, au singulier. C'est
// la seule partie du code que cette contrainte touche, parce que c'est la
// seule qui s'ecrive en base — un nom de champ persiste ne se renomme pas
// sans migration.
//
// L'epine annonce cette cloture testable ; `tests/collections.test.ts` la
// verifie. Ajouter un modele sans l'ajouter ici fait echouer ce test.
export interface CollectionDeclaree {
  readonly nom: string
  readonly module: string
}

export const COLLECTIONS: readonly CollectionDeclaree[] = [
  { nom: 'User', module: 'auth' },
  { nom: 'Session', module: 'auth' },
  { nom: 'Category', module: 'catalog' },
  { nom: 'Language', module: 'catalog' },
  { nom: 'Path', module: 'catalog' },
  { nom: 'Module', module: 'catalog' },
  { nom: 'Lesson', module: 'catalog' },
  { nom: 'Exercise', module: 'exercises' },
  { nom: 'Assessment', module: 'diagnostic' },
  { nom: 'Enrollment', module: 'learning' },
  { nom: 'Progress', module: 'learning' },
  { nom: 'PathRequest', module: 'learning' },
  { nom: 'Submission', module: 'submissions' },
  { nom: 'Feedback', module: 'ai' },
  { nom: 'QuotaCounter', module: 'quota' },
  { nom: 'Subscription', module: 'billing' },
  { nom: 'StripeEvent', module: 'billing' },
  { nom: 'Certification', module: 'certification' },
  { nom: 'Notification', module: 'notifications' },
  { nom: 'AuditEntry', module: 'admin' },
]

export const NOMS_COLLECTIONS: readonly string[] = COLLECTIONS.map(
  (collection) => collection.nom,
)
