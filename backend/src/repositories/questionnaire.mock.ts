import type { Questionnaire, QuestionnaireQuestion } from '../db.schema.ts'

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
  theoreticalContent: undefined,
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
    theoreticalContent: 'Cette question permet d\'évaluer votre niveau de départ pour adapter le parcours d\'apprentissage.',
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
    theoreticalContent: 'Comprendre vos motivations aide à personnaliser votre parcours d\'apprentissage.',
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
    theoreticalContent: 'Cette question permet d\'orienter vers des technologies adaptées à vos intérêts.',
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
    theoreticalContent: 'Cette information permet d\'ajuster la charge de travail du parcours.',
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
    theoreticalContent: 'Comprendre votre style d\'apprentissage permet de proposer la méthode la plus efficace.',
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
    theoreticalContent: 'L\'expérience en équipe influence le type de projets et d\'outils proposés.',
    ...stamps
  }
]

/**
 * Questions de code (3 au total : facile, moyen, difficile)
 */
export const CODE_QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 8,
    questionnaireId: 0, // Sera défini lors de la création du questionnaire
    position: 8,
    type: 'code',
    title: 'Somme de deux nombres',
    description: 'Écrivez une fonction qui prend deux nombres en paramètres et retourne leur somme.',
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
    description: 'Écrivez une fonction qui retourne true si une chaîne de caractères est un palindrome (se lit de la même manière de gauche à droite et de droite à gauche), false autrement.',
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
    description: 'Écrivez une fonction qui retourne la factorielle d\'un nombre n (n! = 1 × 2 × ... × n). Par convention, 0! = 1.',
    placeholder: '// Écrivez votre code ici\nfunction factorielle(n) {\n  // Votre code\n}',
    example: '// Exemples:\n// factorielle(0) devrait retourner 1\n// factorielle(5) devrait retourner 120 (1×2×3×4×5)',
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
      { ...CODE_QUESTIONS[0], id: 8, questionnaireId: 1 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS[1], id: 9, questionnaireId: 1 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS[2], id: 10, questionnaireId: 1 }
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
        theoreticalContent: 'Cette question permet d\'orienter vers des spécialités web spécifiques.'
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
      { ...CODE_QUESTIONS[0], id: 8, questionnaireId: 2 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS[1], id: 9, questionnaireId: 2 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS[2], id: 10, questionnaireId: 2 }
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
        theoreticalContent: 'Cette question permet d\'orienter vers des carrières technologiques spécifiques.'
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
      { ...CODE_QUESTIONS[0], id: 8, questionnaireId: 3 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS[1], id: 9, questionnaireId: 3 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS[2], id: 10, questionnaireId: 3 }
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
        theoreticalContent: 'Cette question permet d\'adapter la méthode pédagogique à vos préférences.'
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
      { ...CODE_QUESTIONS[0], id: 8, questionnaireId: 4 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS[1], id: 9, questionnaireId: 4 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS[2], id: 10, questionnaireId: 4 }
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
        theoreticalContent: 'Cette question permet d\'ajuster l\'intensité et la fréquence du parcours à votre style de vie.'
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
      { ...CODE_QUESTIONS[0], id: 8, questionnaireId: 5 },
      // Position 9 : Question code moyen
      { ...CODE_QUESTIONS[1], id: 9, questionnaireId: 5 },
      // Position 10 : Question code difficile
      { ...CODE_QUESTIONS[2], id: 10, questionnaireId: 5 }
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
    { ...CODE_QUESTIONS[0], id: 8, questionnaireId: 1 },
    { ...CODE_QUESTIONS[1], id: 9, questionnaireId: 1 },
    { ...CODE_QUESTIONS[2], id: 10, questionnaireId: 1 },

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
    { ...CODE_QUESTIONS[0], id: 18, questionnaireId: 2 },
    { ...CODE_QUESTIONS[1], id: 19, questionnaireId: 2 },
    { ...CODE_QUESTIONS[2], id: 20, questionnaireId: 2 },

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
    { ...CODE_QUESTIONS[0], id: 28, questionnaireId: 3 },
    { ...CODE_QUESTIONS[1], id: 29, questionnaireId: 3 },
    { ...CODE_QUESTIONS[2], id: 30, questionnaireId: 3 },

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
    { ...CODE_QUESTIONS[0], id: 38, questionnaireId: 4 },
    { ...CODE_QUESTIONS[1], id: 39, questionnaireId: 4 },
    { ...CODE_QUESTIONS[2], id: 40, questionnaireId: 4 },

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
    { ...CODE_QUESTIONS[0], id: 48, questionnaireId: 5 },
    { ...CODE_QUESTIONS[1], id: 49, questionnaireId: 5 },
    { ...CODE_QUESTIONS[2], id: 50, questionnaireId: 5 }
  ]