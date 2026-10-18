import type { Questionnaire, QuestionnaireQuestion } from '../db/schema.ts'

/**
 * Donnees fictives des questionnaires de positionnement, en attendant la base.
 */

const DATE = new Date('2026-09-25T00:00:00Z')
const stamps = { createdAt: DATE, updatedAt: DATE }

/**
 * Question 2 fixe : Quels langages voulez-vous apprendre
 */
export const FIXED_LANGUAGE_QUESTION: QuestionnaireQuestion = {
  id: 2,
  questionnaireId: 0, // Sera défini lors de la création du questionnaire
  position: 2,
  type: 'language-selection',
  title: 'Quels langages de programmation voulez-vous apprendre ?',
  description: 'Sélectionnez un ou plusieurs langages que vous souhaitez étudier',
  options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C/C++', 'Go', 'Rust', 'Autre'],
  correctAnswer: undefined,
  difficulty: undefined,
  theoreticalContent: 'Votre choix de langage de programmation détermine la direction initiale de votre parcours d\'apprentissage. Chaque langage possède son écosystème spécifique : JavaScript/TypeScript pour le web full-stack, Python pour la data science et l\'automatisation, Java pour les applications d\'entreprise, etc. Nous adapterons les concepts enseignés, les exercices pratiques et les projets selon votre sélection pour que vous appreniez réellement ce qui vous sera utile.',
  ...stamps
}

/**
 * Questions théoriques (6 au total - la question 2 compte comme la 7ème théorique)
 */
export const THEORETICAL_QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 1,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 1,
    type: 'theoretical',
    title: 'Évaluez votre expérience avec la programmation',
    description: 'Quel est votre niveau actuel en programmation ?',
    options: [
      'Débutant absolu (aucune expérience)',
      'Débutant (quelques bases)',
      'Intermédiaire (expérience pratique)',
      'Avancé (expérience professionnelle)',
      'Expert (maîtrise plusieurs langages)'
    ],
    correctAnswer: undefined,
    difficulty: undefined,
    theoreticalContent: 'Cette question évalue votre expérience actuelle en programmation pour personnaliser entièrement votre parcours d\'apprentissage. Selon votre niveau (débutant absolu à expert), nous ajusterons la complexité des concepts, le rythme d\'apprentissage et les types de projets proposés. Un débutant recevra plus de fondamentaux et d\'exercices guidés, tandis qu\'un apprenant avancé pourra se concentrer sur des spécialisations et des projets complexes.',
    ...stamps
  },
  {
    id: 3,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 3,
    type: 'theoretical',
    title: 'Pourquoi voulez-vous apprendre le développement web ?',
    description: 'Décrivez brièvement vos motivations et objectifs',
    options: undefined,
    correctAnswer: undefined,
    difficulty: undefined,
    theoreticalContent: 'Comprendre vos motivations profondes nous permet de créer un parcours d\'apprentissage qui vous engagera réellement. Que vous souhaitiez changer de carrière, créer votre propre startup, développer des jeux vidéo ou simplement apprendre pour le plaisir, nous adaptons les technologies enseignées, les types de projets et les objectifs d\'apprentissage pour que chaque étape ait du sens pour vous et maintienne votre motivation sur le long terme.',
    ...stamps
  },
  {
    id: 4,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 4,
    type: 'theoretical',
    title: 'Quel type de projet vous motive le plus ?',
    description: 'Choisissez le type de projet qui vous enthousiasme le plus',
    options: [
      'Sites web vitrines ou blogs',
      'Applications web interactives',
      'Applications mobiles',
      'Jeux vidéo',
      'Outils ou logiciels utilitaires',
      'Intelligence artificielle ou data science',
      'Autre'
    ],
    correctAnswer: undefined,
    difficulty: undefined,
    theoreticalContent: 'Votre choix de type de projet révèle vos intérêts réels en développement, ce qui nous permet de vous orienter vers les technologies les plus pertinentes. Par exemple, si vous choisissez \"Jeux vidéo\", nous mettrons l\'accent sur WebGL, Unity ou Godot ; pour \"Intelligence artificielle\", nous privilégierons Python, TensorFlow et l\'analyse de données ; pour \"Sites web vitrines\", nous nous concentrerons sur HTML/CSS moderne et l\'accessibilité.',
    ...stamps
  },
  {
    id: 5,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 5,
    type: 'theoretical',
    title: 'Combien de temps pouvez-vous consacrer à l\'apprentissage chaque semaine ?',
    description: 'Estimez votre disponibilité pour étudier et pratiquer',
    options: [
      'Moins de 5 heures',
      '5 à 10 heures',
      '10 à 20 heures',
      'Plus de 20 heures'
    ],
    correctAnswer: undefined,
    difficulty: undefined,
    theoreticalContent: 'Votre disponibilité hebdomadaire est cruciale pour concevoir un parcours réaliste et soutenable. Avec moins de 5 heures par semaine, nous privilégierons un apprentissage modulaire avec des micro-exercices fréquents. Entre 5 et 10 heures, nous équilibrerons théorie et pratique. Au-delà de 10 heures, nous pourrons inclure des projets plus ambitieux et des approfondissements techniques. Ceci évite la surcharge ou l\'ennui, maintenant un progrès constant.',
    ...stamps
  },
  {
    id: 6,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 6,
    type: 'theoretical',
    title: 'Préférez-vous apprendre en suivant des cours structurés ou en expérimentant par vous-même ?',
    description: 'Quel est votre style d\'apprentissage préféré ?',
    options: [
      'Cours structurés avec exercices guidés',
      'Apprentissage par projets pratiques',
      'Mixte : un peu des deux',
      'Apprentissage entièrement autodirigé'
    ],
    correctAnswer: undefined,
    difficulty: undefined,
    theoreticalContent: 'Votre style d\'apprentissage préféré détermine quelles méthodes pédagogiques seront les plus efficaces pour vous. Les apprenants structurés bénéficieront de cours progressifs avec des exercices guidés, tandis que ceux qui préfèrent l\'apprentissage par projets travailleront immédiatement sur des applications concrètes. Un approche mixte combinera le meilleur des deux mondes, et les autodirigés recevront des ressources pour explorer librement avec des points de contrôle périodiques.',
    ...stamps
  },
  {
    id: 7,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 7,
    type: 'theoretical',
    title: 'Avez-vous déjà travaillé en équipe sur des projets de développement ?',
    description: 'Évaluez votre expérience de travail collaboratif en développement',
    options: [
      'Jamais travaillé en équipe sur du code',
      'Quelques expériences en petit groupe',
      'Expérience régulière en équipe',
      'Habitué aux grandes équipes et aux méthodologies Agile'
    ],
    correctAnswer: undefined,
    difficulty: undefined,
    theoreticalContent: 'Votre expérience de travail en équipe détermine dans quelle mesure nous introduirons des outils et des pratiques collaboratifs. Les débutants en travail d\'équipe commenceront avec des pratiques de base comme Git et les revues de code simples. Ceux ayant de l\'équipe régulière seront familiarisés avec des méthodologies Agile, Jira et l\'intégration continue. Les experts en grandes équipes travailleront sur des architectures microservices, des monorepos et des pratiques DevOps avancées.',
    ...stamps
  }
]

/**
 * Questions de code - Ensemble 1 (facile, moyen, difficile)
 */
export const CODE_QUESTIONS_SET1: QuestionnaireQuestion[] = [
  {
    id: 8,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 8,
    type: 'code',
    title: 'Somme de deux nombres',
    description: 'Écrivez une fonction qui prend deux nombres en paramètres et retourne leur somme. Cet exercice évalue votre compréhension des bases de la programmation : déclaration de fonctions, paramètres, retour de valeur et opérations arithmétiques simples. C\'est le fondement sur lequel reposent tous les algorithmes plus complexes.',
    functionName: 'ajouter',
    placeholder: '// Écrivez votre code ici\nfunction ajouter(a, b) {\n  // Votre code\n}',
    example: '// Exemple:\n// ajouter(2, 3) devrait retourner 5',
    ...stamps
  },
  {
    id: 9,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 9,
    type: 'code',
    title: 'Palindrome',
    description: 'Écrivez une fonction qui retourne true si une chaîne de caractères est un palindrome (se lit de la même manière de gauche à droite et de droite à gauche), false autrement. Cet exercice évalue votre capacité à manipuler des chaînes de caractères, à comprendre les boucles ou la récursion, et à penser de manière algorithmique. Les palindromes sont un problème classique qui introduit les concepts de comparaison symétrique et de traitement séquentiel de données.',
    functionName: 'estPalindrome',
    placeholder: '// Écrivez votre code ici\nfunction estPalindrome(chaine) {\n  // Votre code\n}',
    example: '// Exemples:\n// estPalindrome("bonjour") devrait retourner false\n// estPalindrome("radar") devrait retourner true',
    ...stamps
  },
  {
    id: 10,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 10,
    type: 'code',
    title: 'Factorielle',
    description: 'Écrivez une fonction qui retourne la factorielle d\'un nombre n (n! = 1 × 2 × ... × n). Par convention, 0! = 1. Cet exercice évalue votre compréhension de la récursion ou des boucles itératives, ainsi que votre capacité à penser de manière mathématique en programmation. La factorielle est un concept fondamental qui apparaît dans de nombreux domaines comme les probabilités, les combinaisons et l\'analyse d\'algorithmes.',
    functionName: 'factorielle',
    placeholder: '// Écrivez votre code ici\nfunction factorielle(n) {\n  // Votre code\n}',
    example: '// Exemples:\n// factorielle(0) devrait retourner 1\n// factorielle(5) devrait retourner 120 (1×2×3×4×5)',
    ...stamps
  }
]

/**
 * Questions de code - Ensemble 2 (facile, moyen, difficile)
 */
export const CODE_QUESTIONS_SET2: QuestionnaireQuestion[] = [
  {
    id: 8,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 8,
    type: 'code',
    title: 'Nombre pair ou impair',
    description: 'Écrivez une fonction qui retourne true si un nombre est pair, false sinon. Cet exercice évalue votre compréhension des opérateurs modulo et de la logique conditionnelle. Déterminer la parité d\'un nombre est une opération fondamentale utilisée dans de nombreux algorithmes, des tris aux optimisations en passant par la vérification des erreurs.',
    functionName: 'estPair',
    placeholder: '// Écrivez votre code ici\nfunction estPair(n) {\n  // Votre code\n}',
    example: '// Exemples:\n// estPair(4) devrait retourner true\n// estPair(3) devrait retourner false',
    ...stamps
  },
  {
    id: 9,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 9,
    type: 'code',
    title: 'Dernier élément d\'un tableau',
    description: 'Écrivez une fonction qui retourne le dernier élément d\'un tableau, ou undefined si le tableau est vide. Cet exercice évalue votre capacité à travailler avec des tableaux, à comprendre les indices et à gérer les cas limites (tableau vide). La manipulation de tableaux est une compétence essentielle en programmation, présente dans pratiquement toutes les applications réelles.',
    functionName: 'dernierElement',
    placeholder: '// Écrivez votre code ici\nfunction dernierElement(arr) {\n  // Votre code\n}',
    example: '// Exemples:\n// dernierElement([1,2,3]) devrait retourner 3\n// dernierElement([]) devrait retourner undefined',
    ...stamps
  },
  {
    id: 10,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 10,
    type: 'code',
    title: 'Suite de Fibonacci',
    description: 'Écrivez une fonction qui retourne le n-ième nombre de la suite de Fibonacci (avec fib(0) = 0, fib(1) = 1). Cet exercice évalue votre capacité à implémenter des algorithmes récursifs ou itératifs, ainsi que votre compréhension des séquences mathématiques. La suite de Fibonacci apparaît dans de nombreux domaines de l\'informatique, de l\'analyse des algorithmes à la modélisation de phénomènes naturels.',
    functionName: 'fibonacci',
    placeholder: '// Écrivez votre code ici\nfunction fibonacci(n) {\n  // Votre code\n}',
    example: '// Exemples:\n// fibonacci(0) devrait retourner 0\n// fibonacci(1) devrait retourner 1\n// fibonacci(6) devrait retourner 8',
    ...stamps
  }
]

/**
 * Questions de code - Ensemble 3 (facile, moyen, difficile)
 */
export const CODE_QUESTIONS_SET3: QuestionnaireQuestion[] = [
  {
    id: 8,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 8,
    type: 'code',
    title: 'Plus grand de deux nombres',
    description: 'Écrivez une fonction qui retourne le plus grand de deux nombres sans utiliser Math.max. Cet exercice évalue votre capacité à penser logiquement et à implémenter des comparaisons de base. Bien que simple, ce type de raisonnement est la base de algorithmes plus complexes comme le tri ou la recherche de valeurs extrêmes dans des ensembles de données.',
    functionName: 'maxOfTwo',
    placeholder: '// Écrivez votre code ici\nfunction maxOfTwo(a, b) {\n  // Votre code\n}',
    example: '// Exemples:\n// maxOfTwo(5, 3) devrait retourner 5\n// maxOfTwo(-2, -7) devrait retourner -2',
    ...stamps
  },
  {
    id: 9,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 9,
    type: 'code',
    title: 'Moyenne d\'un tableau',
    description: 'Écrivez une fonction qui retourne la moyenne des nombres dans un tableau, ou 0 si le tableau est vide. Cet exercice évalue votre capacité à parcourir des tableaux, à accumuler des valeurs et à gérer les cas limites. Le calcul de moyennes est une opération statistique fondamentale utilisée dans l\'analyse de données, la programmation scientifique et de nombreuses applications réelles.',
    functionName: 'moyenne',
    placeholder: '// Écrivez votre code ici\nfunction moyenne(arr) {\n  // Votre code\n}',
    example: '// Exemples:\n// moyenne([1,2,3,4,5]) devrait retourner 3\n// moyenne([]) devrait retourner 0',
    ...stamps
  },
  {
    id: 10,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 10,
    type: 'code',
    title: 'Trier un tableau',
    description: 'Écrivez une fonction qui retourne une copie du tableau triée par ordre croissant (sans modifier l\'original). Cet exercice évalue votre compréhension des algorithmes de tri et de l\'immutabilité des données. Le tri est l\'un des problèmes les plus étudiés en informatique, avec des applications allant de l\'organisation des listes de fichiers à l\'optimisation des recherches dans de grandes bases de données.',
    functionName: 'trierCroissant',
    placeholder: '// Écrivez votre code ici\nfunction trierCroissant(arr) {\n  // Votre code\n}',
    example: '// Exemple:\n// trierCroissant([3,1,4,1,5]) devrait retourner [1,1,3,4,5]',
    ...stamps
  }
]

/**
 * Questions de code - Ensemble 4 (facile, moyen, difficile)
 */
export const CODE_QUESTIONS_SET4: QuestionnaireQuestion[] = [
  {
    id: 8,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 8,
    type: 'code',
    title: 'Compter les voyelles',
    description: 'Écrivez une fonction qui retourne le nombre de voyelles (a, e, i, o, u) dans une chaîne de caractères. Cet exercice évalue votre capacité à parcourir des chaînes de caractères, à effectuer des tests conditionnels et à accumuler des compteurs. L\'analyse de texte est une compétence fondamentale utilisée dans le traitement du langage naturel, la validation des formulaires et de nombreux outils de développement.',
    functionName: 'compterVoyelles',
    placeholder: '// Écrivez votre code ici\nfunction compterVoyelles(str) {\n  // Votre code\n}',
    example: '// Exemple:\n// compterVoyelles("bonjour") devrait retourner 3',
    ...stamps
  },
  {
    id: 9,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 9,
    type: 'code',
    title: 'Inverser une chaîne',
    description: 'Écrivez une fonction qui retourne une chaîne de caractères inversée. Cet exercice évalue votre compréhension de la manipulation de chaînes de caractères, des tableaux ou de la récursion. L\'inversion de chaînes est une opération courante utilisée dans le traitement du texte, la vérification de palindromes et de nombreux algorithmes de transformation de données.',
    functionName: 'inverserChaine',
    placeholder: '// Écrivez votre code ici\nfunction inverserChaine(str) {\n  // Votre code\n}',
    example: '// Exemple:\n// inverserChaine("bonjour") devrait retourner "ruojnob"',
    ...stamps
  },
  {
    id: 10,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 10,
    type: 'code',
    title: 'Suite de nombres pairs',
    description: 'Écrivez une fonction qui retourne un tableau des nombres pairs de 0 à n (inclus). Cet exercice évalue votre capacité à générer des séquences, à utiliser des conditions de boucle et à travailler avec des tableaux. La génération de séquences numériques est une compétence de base utilisée dans les simulations, les génération de rapports et de nombreux algorithmes mathématiques.',
    functionName: 'pairsJusquaN',
    placeholder: '// Écrivez votre code ici\nfunction pairsJusquaN(n) {\n  // Votre code\n}',
    example: '// Exemple:\n// pairsJusquaN(6) devrait retourner [0,2,4,6]',
    ...stamps
  }
]

/**
 * Questions de code - Ensemble 5 (facile, moyen, difficile)
 */
export const CODE_QUESTIONS_SET5: QuestionnaireQuestion[] = [
  {
    id: 8,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 8,
    type: 'code',
    title: 'Conversion en secondes',
    description: 'Écrivez une fonction qui convertit un temps donné en heures, minutes et secondes en secondes totales. Cet exercice évalue votre capacité à effectuer des conversions d\'unités et à comprendre les systèmes de mesure du temps. La conversion de temps est une compétence pratique utilisée dans la planification, les jeux vidéo, les systèmes embarqués et de nombreuses applications réelles.',
    functionName: 'enSecondes',
    placeholder: '// Écrivez votre code ici\nfunction enSecondes(h, m, s) {\n  // Votre code\n}',
    example: '// Exemple:\n// enSecondes(1, 30, 0) devrait retourner 5400',
    ...stamps
  },
  {
    id: 9,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 9,
    type: 'code',
    title: 'Détecter les doublons',
    description: 'Écrivez une fonction qui retourne true si un tableau contient des doublons, false sinon. Cet exercice évalue votre capacité à rechercher des éléments dans des tableaux, à utiliser des structures de données efficaces (comme les ensembles) et à optimiser les algorithmes. La détection de doublons est une opération courante utilisée dans la validation des données, le nettoyage des bases de données et la prévention des erreurs.',
    functionName: 'contientDoublons',
    placeholder: '// Écrivez votre code ici\nfunction contientDoublons(arr) {\n  // Votre code\n}',
    example: '// Exemples:\n// contientDoublons([1,2,3,4]) devrait retourner false\n// contientDoublons([1,2,2,3]) devrait retourner true',
    ...stamps
  },
  {
    id: 10,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 10,
    type: 'code',
    title: 'Calcul du PGCD',
    description: 'Écrivez une fonction qui retourne le Plus Grand Commun Diviseur de deux nombres en utilisant l\'algorithme d\'Euclide. Cet exercice évalue votre capacité à implémenter des algorithmes classiques et à penser de manière récursive ou itérative. Le PGCD est un concept mathématique fondamental utilisé en cryptographie, en simplification de fractions et en résolution de problèmes de théorie des nombres.',
    functionName: 'pgcd',
    placeholder: '// Écrivez votre code ici\nfunction pgcd(a, b) {\n  // Votre code\n}',
    example: '// Exemple:\n// pgcd(48, 18) devrait retourner 6',
    ...stamps
  }
]

// Fonction helper pour créer un questionnaire complet
export function createQuestionnaire(id: number, title: string, description: string): Questionnaire {
  return {
    id,
    title,
    description,
    status: 'published',
    ...stamps,
    questions: [] // Sera remplie plus tard avec les questions liées
  }
}

// Fonction helper pour lier les questions à un questionnaire
export function attachQuestionsToQuestionnaire(questionnaire: Questionnaire, questions: QuestionnaireQuestion[]): Questionnaire {
  // Mettre à jour l'ID du questionnaire pour chaque question
  const updatedQuestions = questions.map(q => ({
    ...q,
    questionnaireId: questionnaire.id
  }))

  return {
    ...questionnaire,
    questions: updatedQuestions
  }
}

export const MOCK_QUESTIONNAIRES: readonly Questionnaire[] = [
  // Questionnaire 1 : Orientation générale
  attachQuestionsToQuestionnaire(
    createQuestionnaire(
      1,
      'Questionnaire de positionnement - Parcours découverte',
      'Évalue vos motivations, votre expérience et vos objectifs généraux'
    ),
    [
      // Position 1 : Question théorique 1
      { ...THEORETICAL_QUESTIONS[0], id: 1, questionnaireId: 1 },
      // Position 2 : Question fixe (langues)
      { ...FIXED_LANGUAGE_QUESTION, id: 2, questionnaireId: 1 },
      // Position 3 : Question théorique 2
      { ...THEORETICAL_QUESTIONS[1], id: 3, questionnaireId: 1 },
      // Position 4 : Question théorique 3
      { ...THEORETICAL_QUESTIONS[2], id: 4, questionnaireId: 1 },
      // Position 5 : Question théorique 4
      { ...THEORETICAL_QUESTIONS[3], id: 5, questionnaireId: 1 },
      // Position 6 : Question théorique 5
      { ...THEORETICAL_QUESTIONS[4], id: 6, questionnaireId: 1 },
      // Position 7 : Question théorique 6 (7th theoretical total)
      { ...THEORETICAL_QUESTIONS[5], id: 7, questionnaireId: 1 },
      // Position 8 : Question code facile
      { ...CODE_QUESTIONS_SET1[0], id: 8, questionnaireId: 1 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS_SET1[1], id: 9, questionnaireId: 1 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS_SET1[2], id: 10, questionnaireId: 1 }
    ]
  ),

  // Questionnaire 2 : Focus sur le développement web
  attachQuestionsToQuestionnaire(
    createQuestionnaire(
      2,
      'Questionnaire de positionnement - Spécialisation Web',
      'Évalue vos connaissances spécifiques au développement web'
    ),
    [
      // Position 1 : Question théorique 1
      { ...THEORETICAL_QUESTIONS[0], id: 1, questionnaireId: 2 },
      // Position 2 : Question fixe (langues)
      { ...FIXED_LANGUAGE_QUESTION, id: 2, questionnaireId: 2 },
      // Position 3 : Question théorique 2 (adaptée)
      {
        ...THEORETICAL_QUESTIONS[1],
        id: 3,
        questionnaireId: 2,
        title: 'Quel aspect du développement web vous intéresse le plus ?',
        description: 'Choisissez le domaine qui vous attire le plus',
        options: [
          'Frontend (interface utilisateur)',
          'Backend (logique serveur)',
          'Full-stack (les deux)',
          'DevOps et déploiement',
          'Web mobile ou responsive',
          'Accessibilité et performance',
          'Autre'
        ],
        theoreticalContent: 'Comprendre votre domaine d\'intérêt spécifique dans le développement web nous permet de vous orienter vers les technologies les plus pertinentes et à la pointe de l\'industrie. Que vous choisissiez le frontend pour créer des interfaces utilisateur exceptionnelles, le backend pour construire des systèmes robustes et évolutifs, ou le full-stack pour maîtriser toute la chaîne de développement, nous adapterons le curriculum pour vous fournir les compétences exactement recherchées par les employeurs dans votre spécialité choisie.'
      },
      // Position 4 : Question théorique 3
      { ...THEORETICAL_QUESTIONS[2], id: 4, questionnaireId: 2 },
      // Position 5 : Question théorique 4
      { ...THEORETICAL_QUESTIONS[3], id: 5, questionnaireId: 2 },
      // Position 6 : Question théorique 5
      { ...THEORETICAL_QUESTIONS[4], id: 6, questionnaireId: 2 },
      // Position 7 : Question théorique 6 (7th theoretical total)
      { ...THEORETICAL_QUESTIONS[5], id: 7, questionnaireId: 2 },
      // Position 8 : Question code facile
      { ...CODE_QUESTIONS_SET2[0], id: 8, questionnaireId: 2 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS_SET2[1], id: 9, questionnaireId: 2 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS_SET2[2], id: 10, questionnaireId: 2 }
    ]
  ),

  // Questionnaire 3 : Orientation carrière
  attachQuestionsToQuestionnaire(
    createQuestionnaire(
      3,
      'Questionnaire de positionnement - Orientation carrière',
      'Évalue vos aspirations professionnelles dans le domaine tech'
    ),
    [
      // Position 1 : Question théorique 1
      { ...THEORETICAL_QUESTIONS[0], id: 1, questionnaireId: 3 },
      // Position 2 : Question fixe (langues)
      { ...FIXED_LANGUAGE_QUESTION, id: 2, questionnaireId: 3 },
      // Position 3 : Question théorique 2 (adaptée)
      {
        ...THEORETICAL_QUESTIONS[1],
        id: 3,
        questionnaireId: 3,
        title: 'Quel type de rôle technologique vous attire le plus ?',
        description: 'Choisissez le poste qui vous semble le plus adapté à vos compétences',
        options: [
          'Développeur logiciel',
          'Data scientist ou analyste',
          'Ingénieur DevOps ou infrastructure',
          'Designer UX/UI',
          'Chef de projet technique',
          'Consultant ou freelance',
          'Autre'
        ],
        theoreticalContent: 'Identifier le rôle technologique qui vous attire le plus est essentiel pour construire un parcours d\'apprentissage ciblé et pertinent. Que vous soyez attiré par le développement logiciel pour créer des produits tangibles, la data science pour extraire des insights précieux des données, le DevOps pour assurer la fiabilité et l\'évolutivité des systèmes, ou l\'UX/UI pour concevoir des expériences utilisateur exceptionnelles, nous adapterons les technologies enseignées, les projets pratiques et les compétences complémentaires pour vous préparer précisément à votre carrière idéale.'
      },
      // Position 4 : Question théorique 3
      { ...THEORETICAL_QUESTIONS[2], id: 4, questionnaireId: 3 },
      // Position 5 : Question théorique 4
      { ...THEORETICAL_QUESTIONS[3], id: 5, questionnaireId: 3 },
      // Position 6 : Question théorique 5
      { ...THEORETICAL_QUESTIONS[4], id: 6, questionnaireId: 3 },
      // Position 7 : Question théorique 6 (7th theoretical total)
      { ...THEORETICAL_QUESTIONS[5], id: 7, questionnaireId: 3 },
      // Position 8 : Question code facile
      { ...CODE_QUESTIONS_SET3[0], id: 8, questionnaireId: 3 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS_SET3[1], id: 9, questionnaireId: 3 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS_SET3[2], id: 10, questionnaireId: 3 }
    ]
  ),

  // Questionnaire 4 : Approfondissement technique
  attachQuestionsToQuestionnaire(
    createQuestionnaire(
      4,
      'Questionnaire de positionnement - Approfondissement technique',
      'Évalue votre profondeur technique et vos préférences d\'apprentissage'
    ),
    [
      // Position 1 : Question théorique 1
      { ...THEORETICAL_QUESTIONS[0], id: 1, questionnaireId: 4 },
      // Position 2 : Question fixe (langues)
      { ...FIXED_LANGUAGE_QUESTION, id: 2, questionnaireId: 4 },
      // Position 3 : Question théorique 2 (adaptée)
      {
        ...THEORETICAL_QUESTIONS[1],
        id: 3,
        questionnaireId: 4,
        title: 'Quelle approche d\'apprentissage technique préférez-vous ?',
        description: 'Choisissez la méthode qui vous semble la plus efficace pour apprendre la programmation',
        options: [
          'Apprentissage par la résolution de problèmes concrets',
          'Étude approfondie de la théorie avant la pratique',
          'Apprentissage par projets complets',
          'Apprentissage en paire ou en groupe',
          'Suivi de tutoriels pas à pas',
          'Exploration autonome et expérimentation',
          'Autre'
        ],
        theoreticalContent: 'Comprendre votre approche d\'apprentissage technique préférée est fondamental pour maximiser votre efficacité et votre motivation. Que vous appreniez le mieux en résolvant des problèmes concrets qui montrent immédiatement l\'application pratique des concepts, en étudiant profondément la théorie avant de pratiquer pour construire des bases solides, ou par des projets complets qui vous plongent dans des scénarios réels, nous adapterons entièrement notre pédagogie pour corrispondre à votre style d\'apprentissage optimal, ce qui accélérera votre progression et renforcera votre rétention des connaissances.'
      },
      // Position 4 : Question théorique 3
      { ...THEORETICAL_QUESTIONS[2], id: 4, questionnaireId: 4 },
      // Position 5 : Question théorique 4
      { ...THEORETICAL_QUESTIONS[3], id: 5, questionnaireId: 4 },
      // Position 6 : Question théorique 5
      { ...THEORETICAL_QUESTIONS[4], id: 6, questionnaireId: 4 },
      // Position 7 : Question théorique 6 (7th theoretical total)
      { ...THEORETICAL_QUESTIONS[5], id: 7, questionnaireId: 4 },
      // Position 8 : Question code facile
      { ...CODE_QUESTIONS_SET4[0], id: 8, questionnaireId: 4 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS_SET4[1], id: 9, questionnaireId: 4 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS_SET4[2], id: 10, questionnaireId: 4 }
    ]
  ),

  // Questionnaire 5 : Équilibre vie pro/perso
  attachQuestionsToQuestionnaire(
    createQuestionnaire(
      5,
      'Questionnaire de positionnement - Équilibre et bien-être',
      'Évalue vos contraintes personnelles et votre approche de l\'apprentissage durable'
    ),
    [
      // Position 1 : Question théorique 1
      { ...THEORETICAL_QUESTIONS[0], id: 1, questionnaireId: 5 },
      // Position 2 : Question fixe (langues)
      { ...FIXED_LANGUAGE_QUESTION, id: 2, questionnaireId: 5 },
      // Position 3 : Question théorique 2 (adaptée)
      {
        ...THEORETICAL_QUESTIONS[1],
        id: 3,
        questionnaireId: 5,
        title: 'Comment gérez-vous l\'équilibre entre apprentissage et vie personnelle ?',
        description: 'Choisissez l\'approche qui vous convient le mieux',
        options: [
          'Sessions d\'apprentissage courtes et fréquentes',
          'Blocs de temps dédiés plusieurs fois par semaine',
          'Apprentissage intensif sur de courtes périodes',
          'Apprentissage régulier mais modéré',
          'Apprentissage principalement le week-end',
          'Adaptation constante selon mes disponibilités',
          'Autre'
        ],
        theoreticalContent: 'Comprendre comment vous équilibrez l\'apprentissage avec vos autres engagements de vie est crucial pour créer un parcours d\'apprentissage soutenable sur le long terme. Que vous préfériez des sessions courtes et fréquentes pour maintenir un rythme régulier, des blocs de temps dédiés pour une immersion profonde, ou un apprentissage principalement le week-end en raison de vos contraintes professionnelles, nous adapterons l\'intensité, la fréquence et la répartition des activités pour que votre apprentissage s\'intègre harmonieusement dans votre vie sans causer de surcharge ou de frustration.'
      },
      // Position 4 : Question théorique 3
      { ...THEORETICAL_QUESTIONS[2], id: 4, questionnaireId: 5 },
      // Position 5 : Question théorique 4
      { ...THEORETICAL_QUESTIONS[3], id: 5, questionnaireId: 5 },
      // Position 6 : Question théorique 5
      { ...THEORETICAL_QUESTIONS[4], id: 6, questionnaireId: 5 },
      // Position 7 : Question théorique 6 (7th theoretical total)
      { ...THEORETICAL_QUESTIONS[5], id: 7, questionnaireId: 5 },
      // Position 8 : Question code facile
      { ...CODE_QUESTIONS_SET5[0], id: 8, questionnaireId: 5 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS_SET5[1], id: 9, questionnaireId: 5 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS_SET5[2], id: 10, questionnaireId: 5 }
    ]
  )
]

  // Recreate the flat list of all questions with correct questionnaireId
  export const MOCK_QUESTIONNAIRE_QUESTIONS: readonly QuestionnaireQuestion[] = [
    // Questionnaire 1 questions
    { ...THEORETICAL_QUESTIONS[0], id: 1, questionnaireId: 1 },
    { ...FIXED_LANGUAGE_QUESTION, id: 2, questionnaireId: 1 },
    { ...THEORETICAL_QUESTIONS[1], id: 3, questionnaireId: 1 },
    { ...THEORETICAL_QUESTIONS[2], id: 4, questionnaireId: 1 },
    { ...THEORETICAL_QUESTIONS[3], id: 5, questionnaireId: 1 },
    { ...THEORETICAL_QUESTIONS[4], id: 6, questionnaireId: 1 },
    { ...THEORETICAL_QUESTIONS[5], id: 7, questionnaireId: 1 },
    { ...CODE_QUESTIONS_SET1[0], id: 8, questionnaireId: 1 },
    { ...CODE_QUESTIONS_SET1[1], id: 9, questionnaireId: 1 },
    { ...CODE_QUESTIONS_SET1[2], id: 10, questionnaireId: 1 },

    // Questionnaire 2 questions
    { ...THEORETICAL_QUESTIONS[0], id: 11, questionnaireId: 2 },
    { ...FIXED_LANGUAGE_QUESTION, id: 12, questionnaireId: 2 },
    {
      ...THEORETICAL_QUESTIONS[1],
      id: 13,
      title: 'Quel aspect du développement web vous intéresse le plus ?',
      description: 'Choisissez le domaine qui vous attire le plus',
      options: [
        'Frontend (interface utilisateur)',
        'Backend (logique serveur)',
        'Full-stack (les deux)',
        'DevOps et déploiement',
        'Web mobile ou responsive',
        'Accessibilité et performance',
        'Autre'
      ],
      theoreticalContent: 'Cette question permet d\'orienter vers des spécialités web spécifiques.',
      questionnaireId: 2
    },
    { ...THEORETICAL_QUESTIONS[2], id: 14, questionnaireId: 2 },
    { ...THEORETICAL_QUESTIONS[3], id: 15, questionnaireId: 2 },
    { ...THEORETICAL_QUESTIONS[4], id: 16, questionnaireId: 2 },
    { ...THEORETICAL_QUESTIONS[5], id: 17, questionnaireId: 2 },
    { ...CODE_QUESTIONS_SET2[0], id: 18, questionnaireId: 2 },
    { ...CODE_QUESTIONS_SET2[1], id: 19, questionnaireId: 2 },
    { ...CODE_QUESTIONS_SET2[2], id: 20, questionnaireId: 2 },

    // Questionnaire 3 questions
    { ...THEORETICAL_QUESTIONS[0], id: 21, questionnaireId: 3 },
    { ...FIXED_LANGUAGE_QUESTION, id: 22, questionnaireId: 3 },
    {
      ...THEORETICAL_QUESTIONS[1],
      id: 23,
      title: 'Quel type de rôle technologique vous attire le plus ?',
      description: 'Choisissez le poste qui vous semble le plus adapté à vos compétences',
      options: [
        'Développeur logiciel',
        'Data scientist ou analyste',
        'Ingénieur DevOps ou infrastructure',
        'Designer UX/UI',
        'Chef de projet technique',
        'Consultant ou freelance',
        'Autre'
      ],
      theoreticalContent: 'Cette question permet d\'orienter vers des carrières technologiques spécifiques.',
      questionnaireId: 3
    },
    { ...THEORETICAL_QUESTIONS[2], id: 24, questionnaireId: 3 },
    { ...THEORETICAL_QUESTIONS[3], id: 25, questionnaireId: 3 },
    { ...THEORETICAL_QUESTIONS[4], id: 26, questionnaireId: 3 },
    { ...THEORETICAL_QUESTIONS[5], id: 27, questionnaireId: 3 },
    { ...CODE_QUESTIONS_SET3[0], id: 28, questionnaireId: 3 },
    { ...CODE_QUESTIONS_SET3[1], id: 29, questionnaireId: 3 },
    { ...CODE_QUESTIONS_SET3[2], id: 30, questionnaireId: 3 },

    // Questionnaire 4 questions
    { ...THEORETICAL_QUESTIONS[0], id: 31, questionnaireId: 4 },
    { ...FIXED_LANGUAGE_QUESTION, id: 32, questionnaireId: 4 },
    {
      ...THEORETICAL_QUESTIONS[1],
      id: 33,
      title: 'Quelle approche d\'apprentissage technique préférez-vous ?',
      description: 'Choisissez la méthode qui vous semble la plus efficace pour apprendre la programmation',
      options: [
        'Apprentissage par la résolution de problèmes concrets',
        'Étude approfondie de la théorie avant la pratique',
        'Apprentissage par projets complets',
        'Apprentissage en paire ou en groupe',
        'Suivi de tutoriels pas à pas',
        'Exploration autonome et expérimentation',
        'Autre'
      ],
      theoreticalContent: 'Cette question permet d\'adapter la méthode pédagogique à vos préférences.',
      questionnaireId: 4
    },
    { ...THEORETICAL_QUESTIONS[2], id: 34, questionnaireId: 4 },
    { ...THEORETICAL_QUESTIONS[3], id: 35, questionnaireId: 4 },
    { ...THEORETICAL_QUESTIONS[4], id: 36, questionnaireId: 4 },
    { ...THEORETICAL_QUESTIONS[5], id: 37, questionnaireId: 4 },
    { ...CODE_QUESTIONS_SET4[0], id: 38, questionnaireId: 4 },
    { ...CODE_QUESTIONS_SET4[1], id: 39, questionnaireId: 4 },
    { ...CODE_QUESTIONS_SET4[2], id: 40, questionnaireId: 4 },

    // Questionnaire 5 questions
    { ...THEORETICAL_QUESTIONS[0], id: 41, questionnaireId: 5 },
    { ...FIXED_LANGUAGE_QUESTION, id: 42, questionnaireId: 5 },
    {
      ...THEORETICAL_QUESTIONS[1],
      id: 43,
      title: 'Comment gérez-vous l\'équilibre entre apprentissage et vie personnelle ?',
      description: 'Choisissez l\'approche qui vous convient le mieux',
      options: [
        'Sessions d\'apprentissage courtes et fréquentes',
        'Blocs de temps dédiés plusieurs fois par semaine',
        'Apprentissage intensif sur de courtes périodes',
        'Apprentissage régulier mais modéré',
        'Apprentissage principalement le week-end',
        'Adaptation constante selon mes disponibilités',
        'Autre'
      ],
      theoreticalContent: 'Cette question permet d\'ajuster l\'intensité et la fréquence du parcours à votre style de vie.',
      questionnaireId: 5
    },
    { ...THEORETICAL_QUESTIONS[2], id: 44, questionnaireId: 5 },
    { ...THEORETICAL_QUESTIONS[3], id: 45, questionnaireId: 5 },
    { ...THEORETICAL_QUESTIONS[4], id: 46, questionnaireId: 5 },
    { ...THEORETICAL_QUESTIONS[5], id: 47, questionnaireId: 5 },
    { ...CODE_QUESTIONS_SET5[0], id: 48, questionnaireId: 5 },
    { ...CODE_QUESTIONS_SET5[1], id: 49, questionnaireId: 5 },
    { ...CODE_QUESTIONS_SET5[2], id: 50, questionnaireId: 5 }
  ];
