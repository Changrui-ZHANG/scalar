// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

// Le front ne redeclare pas la forme d'une reponse d'API : elle est declaree
// une fois dans `shared/`, et importee. La regle est une heuristique, et son
// plafond est assume — ESLint ne voit que le nom d'une interface, jamais ce
// qu'elle decrit. Elle attrape la negligence, pas la malice : qui dupliquera
// un contrat sous un autre nom passera. La garantie forte est ailleurs, dans
// le fait que le type importe rend une divergence visible au typage.
// Les deux ordres de nommage, parce que ce depot ecrit ses identifiants en
// francais : le nom de tete y vient en premier (`ReponseInscription`), la ou
// l'anglais le met en dernier (`InscriptionReponse`). Ne couvrir que le suffixe
// laissait passer la forme la plus naturelle d'ici.
const NOM_DE_REPONSE_API = /^((Corps|Reponse|Response)\w*|\w+(Reponse|Response|Payload|Dto|DTO))$/

const MESSAGE_REPONSE_API =
  "Ce nom decrit une reponse d'API. Ne la redeclarez pas ici : importez son contrat depuis `shared/`. Un type de props de composant reste legitime, mais ne doit pas se lire comme une reponse."

export default withNuxt(
  {
    // Les composants de `components/ui/` sont livres par shadcn-vue et repris
    // tels quels : `DESIGN.md` interdit explicitement de les personnaliser, et
    // les corriger pour satisfaire une regle de style les ferait diverger de
    // l'amont a la premiere mise a jour. Ils ne sont donc pas lintes.
    ignores: ['app/components/ui/**'],
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        // Les quatre facons de declarer une forme en TypeScript. En omettre une
        // suffit a contourner la regle sans effort : une reponse d'API declaree
        // en classe passait les deux premiers selecteurs.
        ...[
          'TSInterfaceDeclaration',
          'TSTypeAliasDeclaration',
          'ClassDeclaration',
          'TSEnumDeclaration',
        ].map((sorte) => ({
          selector: `${sorte}[id.name=${NOM_DE_REPONSE_API}]`,
          message: MESSAGE_REPONSE_API,
        })),
      ],
    },
  },
)
