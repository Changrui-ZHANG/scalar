<script setup lang="ts">
useSeoMeta({
  title: 'Politique de confidentialité — Scalar',
  description:
    'Politique de confidentialité de Scalar : aucun compte, aucune donnée personnelle collectée, progression stockée localement.',
})
</script>

<template>
  <article class="max-w-[680px] mx-auto py-12 px-4 space-y-8">
    <header class="space-y-2 border-b border-border pb-6">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Politique de confidentialité</h1>
      <p class="text-sm text-muted-foreground">Dernière mise à jour : 21 octobre 2026</p>
    </header>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">1. Responsables du traitement</h2>
      <p class="text-muted-foreground leading-relaxed">
        Le traitement des données éventuelles est sous la responsabilité de Changrui ZHANG et Cédric
        VONIN. Pour toute question ou demande :
        <a href="mailto:m.zhang.changrui@gmail.com" class="text-brand underline hover:opacity-80">
          m.zhang.changrui@gmail.com
        </a>.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">2. Absence de collecte de données personnelles</h2>
      <p class="text-muted-foreground leading-relaxed">
        Scalar est conçu selon le principe de minimisation stricte : aucun compte utilisateur n'est
        requis, aucune inscription n'est demandée, et aucune donnée personnelle nominative n'est
        collectée lors de votre navigation ou de votre apprentissage.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">3. Données conservées dans votre navigateur</h2>
      <p class="text-muted-foreground leading-relaxed">
        Afin de vous offrir une expérience fluide, les données suivantes sont stockées exclusivement
        dans la mémoire locale de votre navigateur (<code>localStorage</code> et
        <code>sessionStorage</code>) :
      </p>
      <ul class="list-disc list-inside space-y-1 text-muted-foreground pl-2">
        <li>Votre progression dans les parcours, chapitres, leçons et exercices ;</li>
        <li>Vos brouillons de code saisis dans les éditeurs ;</li>
        <li>Les indices que vous avez choisi de révéler ;</li>
        <li>Vos préférences d'affichage (thème clair/sombre, état de repli du plan de cours).</li>
      </ul>
      <p class="text-muted-foreground leading-relaxed">
        Ces informations ne sont <strong>jamais transmises à nos serveurs</strong>. Vous pouvez les
        effacer à tout moment en vidant les données de navigation de votre navigateur. Ces éléments
        étant strictement nécessaires à la fourniture du service expressément demandé par
        l'utilisateur, aucun bandeau de consentement préalable n'est requis.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">4. Exécution du code</h2>
      <p class="text-muted-foreground leading-relaxed">
        Lorsque vous utilisez les fonctionnalités « Exécuter » ou « Vérifier », votre code est
        transmis à notre moteur d'exécution isolé (Piston) afin d'en évaluer le résultat. Une fois
        l'exécution terminée, le conteneur est détruit et le code soumis est immédiatement oublié :
        il n'est ni stocké en base de données ni conservé dans les journaux.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">5. Statistiques anonymes</h2>
      <p class="text-muted-foreground leading-relaxed">
        Le service comptabilise des indicateurs d'usage strictement agrégés et anonymes par jour
        (par exemple le nombre de vérifications réussies par exercice). Aucun identifiant
        utilisateur, cookie persistant ou adresse IP n'est associé à ces mesures.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">6. Journaux techniques et sécurité</h2>
      <p class="text-muted-foreground leading-relaxed">
        Les serveurs consignent des journaux d'accès techniques minimaux (méthode HTTP, URL demandée,
        code de réponse HTTP, durée d'exécution). Les adresses IP ne sont pas enregistrées dans les
        journaux persistants ; elles sont uniquement traitées en mémoire vive de manière temporaire
        (moins d'une minute) pour assurer la prévention des abus (limitation de débit).
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">7. Cookies</h2>
      <p class="text-muted-foreground leading-relaxed">
        Scalar n'utilise aucun cookie traceur, publicitaire ou tiers.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">8. Vos droits</h2>
      <p class="text-muted-foreground leading-relaxed">
        Pour toute question relative à cette politique, vous pouvez nous écrire à l'adresse indiquée
        ci-dessus. Vous disposez également du droit d'introduire une réclamation auprès de l'autorité
        de contrôle compétente (la CNIL sur
        <a
          href="https://www.cnil.fr"
          target="_blank"
          rel="noopener noreferrer"
          class="text-brand underline hover:opacity-80"
        >
          cnil.fr
        </a>).
      </p>
    </section>
  </article>
</template>
