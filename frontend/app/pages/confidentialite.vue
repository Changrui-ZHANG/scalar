<script setup lang="ts">
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Politique de confidentialité'],
  description: "Politique de confidentialité de Scalar : aucun compte, stockage local uniquement.",
  type: 'website',
})
</script>

<template>
  <div class="px-4 md:px-6">
    <LegalArticle title="Politique de confidentialité" updated-at="2026-10-21T00:00:00Z">
      <h2>1. Principe fondamental : aucun compte requis</h2>
      <p>
        Scalar a été conçu dans le respect strict de la vie privée. L'accès aux cours,
        leçons, exercices et au bac à sable s'effectue sans aucune inscription préalable ni
        création de compte utilisateur.
      </p>

      <h2>2. Données personnelles et navigation</h2>
      <p>
        Aucune donnée directement identifiante (nom, prénom, adresse email, mot de passe)
        n'est collectée lors de votre utilisation normale du site.
      </p>

      <h2>3. Progression et stockage local</h2>
      <p>
        Votre progression pédagogique (leçons lues, exercices résolus, chapitres complétés,
        brouillons de code) est enregistrée <strong>exclusivement au sein de votre navigateur</strong>
        (via le mécanisme de <code>localStorage</code>).
      </p>
      <p>
        Ces données ne sont jamais synchronisées sur nos serveurs de façon nominative. Vous
        pouvez à tout moment réinitialiser votre progression en vidant les données de site de
        votre navigateur.
      </p>

      <h2>4. Cookies et traceurs</h2>
      <p>
        Scalar n'utilise <strong>aucun cookie publicitaire</strong> ni aucun outil de pistage
        commercial tiers.
      </p>

      <h2>5. Exécution de code et sécurité</h2>
      <p>
        Le code soumis lors de l'exécution ou de la vérification d'un exercice est transmis de
        manière sécurisée à notre environnement d'exécution isolé (Piston) aux seules fins d'évaluation
        immédiate. Il n'est conservé dans aucune base de données nominative.
      </p>

      <h2>6. Vos droits et réclamations (CNIL)</h2>
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
        d'un droit d'accès, de rectification et de suppression des données vous concernant.
        Comme nous ne conservons aucune donnée identifiante sur nos serveurs, vous gardez la
        maîtrise complète de vos données directement depuis votre poste.
      </p>
      <p>
        Vous pouvez adresser toute demande à
        <a href="mailto:m.zhang.changrui@gmail.com">
          m.zhang.changrui@gmail.com
        </a>, ou introduire une réclamation auprès de la CNIL si nécessaire.
      </p>
    </LegalArticle>
  </div>
</template>
