<script setup lang="ts">
import { usePageSeo } from '~/composables/usePageSeo'

definePageMeta({ layout: 'default' })

usePageSeo({
  title: ['Mentions légales'],
  description: "Mentions légales du site Scalar, informations relatives à l'éditeur et à l'hébergement.",
  type: 'website',
})
</script>

<template>
  <div class="px-4 md:px-6">
    <LegalArticle title="Mentions légales" updated-at="2026-10-21T00:00:00Z">
      <h2>1. Éditeurs du site</h2>
      <p>
        Le site <strong>Scalar</strong> est édité par Changrui ZHANG et Cédric VONIN, agissant en
        qualité de particuliers dans le cadre d'un projet d'études au sein de l'ESGI.
      </p>
      <ul>
        <li><strong>Directeur de la publication :</strong> Changrui ZHANG</li>
        <li>
          <strong>Contact :</strong>
          <a href="mailto:m.zhang.changrui@gmail.com">
            m.zhang.changrui@gmail.com
          </a>
        </li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>
        L'infrastructure et l'hébergement des services sont assurés sur des serveurs situés au sein
        de l'Union européenne (OVHcloud / Hostinger).
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus présents sur le site Scalar (textes, leçons, exercices, structure
        pédagogique, code source, logos et éléments graphiques) est protégé par les lois relatives à
        la propriété intellectuelle et demeure la propriété exclusive de ses éditeurs.
      </p>
      <p>
        Toute reproduction, représentation, modification ou diffusion, totale ou partielle, sans
        l'accord préalable écrit des éditeurs est formellement interdite.
      </p>

      <h2>4. Responsabilité</h2>
      <p>
        Les éditeurs s'efforcent d'assurer l'exactitude des informations diffusées et le bon
        fonctionnement du service d'exécution de code. Ils ne sauraient toutefois être tenus
        responsables des éventuelles interruptions de service, inexactitudes ou conséquences
        découlant de l'utilisation du site.
      </p>
    </LegalArticle>
  </div>
</template>
