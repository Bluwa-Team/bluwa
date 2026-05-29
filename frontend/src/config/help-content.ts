// ── Aide contextuelle par section ─────────────────────────────────────────────
// Affiché via <HelpPopover section="key" /> dans chaque en-tête de page.

export type HelpEntry = {
  title:       string
  icon:        string
  description: string
  tips:        string[]
  glossary?:   Array<{ term: string; def: string }>
}

export const HELP_CONTENT: Record<string, HelpEntry> = {

  // ── Référentiels ──────────────────────────────────────────────────────────

  articles: {
    title:       'Articles (MDM)',
    icon:        '📦',
    description: 'Le référentiel maître des articles : matières premières, semi-finis, produits finis, articles de conditionnement et consommables.',
    tips: [
      'Créez d\'abord les MP et AC avant les PF — la nomenclature en dépend.',
      'Le code SKU est généré automatiquement selon la règle de codification de votre organisation.',
      'Renseignez la durée de vie (jours) pour que la DLC soit calculée automatiquement à la réception.',
      'Un article "Bloqué" ne peut plus être utilisé en BC, OF ou mouvement de stock.',
    ],
    glossary: [
      { term: 'MP',  def: 'Matière Première — acheté, consommé en production' },
      { term: 'PF',  def: 'Produit Fini — fabriqué, destiné à la vente' },
      { term: 'AC',  def: 'Article de Conditionnement — bouteilles, bouchons, étiquettes…' },
      { term: 'PMP', def: 'Prix Moyen Pondéré — coût moyen recalculé à chaque réception' },
    ],
  },

  clients: {
    title:       'Clients',
    icon:        '🤝',
    description: 'Annuaire des clients avec grilles tarifaires négociées et historique des commandes.',
    tips: [
      'Renseignez le mode de paiement mobile (Wave / Orange Money) si accepté.',
      'La grille tarifaire permet de négocier un prix par article pour ce client.',
      'Le crédit max bloque automatiquement les nouvelles commandes si dépassé.',
    ],
    glossary: [
      { term: 'Incoterm', def: 'Règle de transfert de risque et de frais logistiques (EXW, DAP…)' },
      { term: 'Délai paiement', def: 'Nombre de jours accordés au client pour régler la facture' },
    ],
  },

  fournisseurs: {
    title:       'Fournisseurs',
    icon:        '🚚',
    description: 'Annuaire des fournisseurs avec score de fiabilité, contrats-cadres et historique des livraisons.',
    tips: [
      'Le score est calculé automatiquement à partir des délais, de la qualité et des prix.',
      'Un fournisseur "Informel" génère un Bon d\'Achat (BA) au lieu d\'un Bon de Commande (BC).',
      'Créez un contrat-cadre pour pré-remplir le prix unitaire lors de chaque commande.',
    ],
    glossary: [
      { term: 'BC', def: 'Bon de Commande — fournisseur formel avec contrat' },
      { term: 'BA', def: 'Bon d\'Achat — fournisseur informel, marché local' },
    ],
  },

  // ── Sourcing & Approvisionnement ──────────────────────────────────────────

  approvisionnement: {
    title:       'Approvisionnement',
    icon:        '🛒',
    description: 'Gestion des commandes fournisseurs (BC/BA), des stratégies MRP par article et des demandes d\'achat générées par le moteur de calcul.',
    tips: [
      'Onglet "Commandes" : créez un BC (fournisseur formel) ou un BA (marché informel).',
      'Onglet "Stratégie" : définissez la politique d\'approvisionnement en fonction du stock de sécurité et du point de commande.',
      'Les "Demandes d\'achat" sont générées automatiquement par le MRP — validez-les en BC/BA.',
      'Un BC au statut "Partiel" signifie qu\'une réception a été créée mais pas clôturée.',
    ],
    glossary: [
      { term: '', def: 'MRP Planification — piloté par les prévisions ou commandes fermes' },
      { term: '', def: 'Point de commande — déclenché quand le stock passe sous le seuil' },
      { term: '', def: 'Pas de MRP — approvisionnement manuel uniquement' },
    ],
  },

  reception: {
    title:       'Réceptions fournisseurs',
    icon:        '📥',
    description: 'Enregistrement des livraisons fournisseurs : saisie des quantités, numéros de lot, DLC, et déclenchement du contrôle qualité.',
    tips: [
      'Sélectionnez le BC/BA correspondant pour pré-remplir l\'article et la quantité attendue.',
      'Le numéro de lot interne est généré automatiquement (ex. LOT-MP-2026-0031).',
      'La DLC est calculée automatiquement si la durée de vie est renseignée sur l\'article.',
      'Chaque réception crée automatiquement un lot en "En contrôle" dans le module Qualité.',
      'Utilisez le bouton Étiquettes pour imprimer les étiquettes de traçabilité par contenant.',
    ],
    glossary: [
      { term: 'DLC',  def: 'Date Limite de Consommation — calculée = date réception + durée de vie' },
      { term: 'Lot',  def: 'Numéro de traçabilité unique attribué à chaque livraison d\'un article' },
      { term: 'DLUO', def: 'Date Limite d\'Utilisation Optimale — pour les produits à longue conservation' },
    ],
  },

  // ── Stocks ────────────────────────────────────────────────────────────────

  stocks: {
    title:       'Gestion des stocks',
    icon:        '🏭',
    description: 'Suivi multi-entrepôt en temps réel : quantités disponibles, valeur PMP, mouvements d\'entrée/sortie/transfert, et gestion FEFO des lots.',
    tips: [
      'Onglet "Stock" : vue consolidée par article et entrepôt avec valeur au PMP.',
      'Onglet "Mouvements" : historique complet de tous les flux (réception, production, ajustement).',
      'Onglet "Lots" : liste FEFO — les lots avec la DLC la plus proche apparaissent en premier.',
      'Un mouvement d\'ajustement permet de corriger un écart d\'inventaire.',
    ],
    glossary: [
      { term: 'PMP',  def: 'Prix Moyen Pondéré — coût recalculé à chaque entrée en stock' },
      { term: 'FEFO', def: 'First Expired, First Out — sortir d\'abord les lots à DLC la plus proche' },
      { term: 'FIFO', def: 'First In, First Out — sortir d\'abord les lots les plus anciens' },
    ],
  },

  inventaire: {
    title:       'Inventaire physique',
    icon:        '📋',
    description: 'Comptage physique des stocks par zone et entrepôt. Génère un document d\'inventaire avec les écarts entre stock théorique et stock réel.',
    tips: [
      'Créez un document d\'inventaire pour démarrer une session de comptage.',
      'Saisissez les quantités comptées ligne par ligne — l\'écart est calculé automatiquement.',
      'Validez le document pour confirmer les comptages avant de le "Comptabiliser" (ajustement définitif).',
      'Un document comptabilisé est immuable — les écarts sont enregistrés comme ajustements de stock.',
    ],
    glossary: [
      { term: 'Écart', def: 'Qté comptée − Qté théorique (positif = surplus, négatif = manque)' },
      { term: 'POSTED', def: 'Document comptabilisé — les ajustements sont passés en stock définitivement' },
    ],
  },

  // ── MRP ───────────────────────────────────────────────────────────────────

  mrp: {
    title:       'MRP — Planification',
    icon:        '🧮',
    description: 'Moteur de calcul des besoins nets : analyse les commandes, les prévisions et les stocks pour recommander les achats et fabrications à lancer.',
    tips: [
      'Tab ① Besoins nets : besoin net = max(commandes, prévisions) − stock − en-cours.',
      'Tab ② Composants 6 mois : explosion BOM pour chaque MP/AC par mois.',
      'Tab ③ OP planifiés : Ordres de Production projetés sur l\'horizon.',
      'Tab ④ Recommandations : validez (→ DA) ou ignorez chaque recommandation générée.',
      'Les recommandations urgentes (< 7j) apparaissent en rouge avec un countdown.',
    ],
    glossary: [
      { term: 'BOM',      def: 'Nomenclature — liste des composants pour fabriquer 1 unité de PF' },
      { term: 'DA',       def: 'Demande d\'Achat — convertie en BC/BA par l\'approvisionneur' },
      { term: 'BN',       def: 'Besoin Net — ce qu\'il faut commander ou fabriquer après déduction du stock' },
      { term: 'Taille lot', def: 'Quantité minimale de commande ou de fabrication (lot économique)' },
    ],
  },

  // ── Production ────────────────────────────────────────────────────────────

  production: {
    title:       'Ordres de Fabrication',
    icon:        '🏗️',
    description: 'Planification et suivi des ordres de fabrication : de la création à la clôture, avec gestion du picking composants et avancement en temps réel.',
    tips: [
      'Cycle de vie : Planifié → En cours → Contrôle qualité → Dispo → Terminé.',
      'Validez le picking avant de lancer un OF pour confirmer que les composants sont disponibles.',
      'La vue "Par période" donne une vision 3 mois pour anticiper la charge.',
      'Utilisez "Finir production" pour passer l\'OF en phase de contrôle qualité.',
    ],
    glossary: [
      { term: 'OF',       def: 'Ordre de Fabrication — instruction de produire X unités d\'un PF' },
      { term: 'Picking',  def: 'Prélèvement physique des composants avant le lancement en ligne' },
      { term: 'Lot PF',   def: 'Numéro de lot du produit fini fabriqué (traçabilité sortante)' },
    ],
  },

  mes: {
    title:       'Suivi MES (Temps réel)',
    icon:        '📡',
    description: 'Tableau de bord temps réel de la production : déclarations d\'avancement, signalement d\'arrêts, journal des événements et TRS par ligne.',
    tips: [
      '"Déclarer production" : saisissez la quantité produite depuis le début du poste.',
      '"Signaler arrêt" : sélectionnez le motif — cet arrêt est enregistré dans le journal.',
      'Le TRS (Taux de Rendement Synthétique) = temps utile / temps ouvert.',
      'Le journal MES est l\'enregistrement officiel pour les rapports de production.',
    ],
    glossary: [
      { term: 'TRS',   def: 'Taux de Rendement Synthétique — indicateur clé de performance des lignes' },
      { term: 'Arrêt', def: 'Interruption de production (panne, manque MP, nettoyage, réglage…)' },
    ],
  },

  postesDeCharge: {
    title:       'Postes de charge',
    icon:        '⚙️',
    description: 'Référentiel des équipements de production avec leur capacité journalière, taux horaire et TRS moyen. Utilisés dans les gammes de fabrication.',
    tips: [
      'Le taux horaire (XOF/h) est utilisé pour calculer le coût standard de la gamme.',
      'La capacité effective = capacité journalière × TRS%. Elle conditionne le planning MRP.',
      'Désactivez un poste (bouton Power) pour l\'exclure des calculs sans le supprimer.',
    ],
    glossary: [
      { term: 'Taux horaire', def: 'Coût d\'utilisation du poste par heure (amortissement + énergie + main d\'œuvre)' },
      { term: 'TRS',          def: 'Taux de Rendement Synthétique — % du temps où le poste produit réellement' },
    ],
  },

  lots: {
    title:       'Lots de production',
    icon:        '🔖',
    description: 'Déclarations de fin de fabrication : enregistrement des quantités produites, rebuts, numéro de lot PF et DLC. Cycle DRAFT → CONFIRMÉ → COMPTABILISÉ.',
    tips: [
      'Créez une déclaration DRAFT à la fin de chaque OF — elle est modifiable.',
      '"Confirmer" : validation chef d\'équipe — le lot PF est visible en Qualité.',
      '"Comptabiliser" : entrée définitive en stock — immuable, génère le mouvement de stock.',
      'Le taux de rebut > 5 % déclenche une alerte rouge.',
    ],
    glossary: [
      { term: 'DRAFT',       def: 'Brouillon — déclaration en cours, modifiable' },
      { term: 'CONFIRMED',   def: 'Confirmé par le chef d\'équipe — en attente de comptabilisation' },
      { term: 'POSTED',      def: 'Comptabilisé — entrée en stock effective, immuable' },
      { term: 'Taux rebut',  def: 'Qté rebuts / Qté produite × 100 (%) — perte process' },
    ],
  },

  // ── Qualité ───────────────────────────────────────────────────────────────

  qualite: {
    title:       'Centre de Libération',
    icon:        '🧪',
    description: 'Contrôle et libération des lots en quarantaine : réceptions fournisseurs et fins de production. Chaque lot doit être "Libéré" avant d\'être utilisé.',
    tips: [
      'Les lots apparaissent automatiquement à la réception ou à la fin de production.',
      '"Libérer" : lot conforme — disponible pour la production ou la vente.',
      '"Rejeter" : lot non conforme — bloqué, génère automatiquement une NC.',
      'Renseignez les commentaires de décision pour l\'audit (pH, Brix, humidité…).',
    ],
    glossary: [
      { term: 'En contrôle', def: 'Quarantaine — lot reçu, en attente de décision qualité' },
      { term: 'Libéré',      def: 'Lot conforme, disponible pour utilisation ou expédition' },
      { term: 'Rejeté',      def: 'Lot non conforme — bloqué, action corrective requise' },
      { term: 'CCP',         def: 'Critical Control Point — point de contrôle critique HACCP' },
    ],
  },

  nonConformites: {
    title:       'Non-Conformités',
    icon:        '⚠️',
    description: 'Registre des écarts qualité détectés à la réception ou en production. Chaque NC est tracée avec sa cause, son action corrective et son responsable.',
    tips: [
      'Une NC est créée automatiquement lors d\'un rejet de lot en Libération.',
      'Actions correctives : Rebut (destruction), Retravail (retraitement), Dérogation (utilisation sous condition).',
      'Clôturez la NC une fois l\'action corrective réalisée et vérifiée.',
    ],
    glossary: [
      { term: 'NC',          def: 'Non-Conformité — écart par rapport aux spécifications' },
      { term: 'Rebut',       def: 'Destruction du lot non conforme' },
      { term: 'Retravail',   def: 'Retraitement pour remettre le lot en conformité' },
      { term: 'Dérogation',  def: 'Utilisation du lot en dehors des spécifications, sous accord écrit' },
    ],
  },

  genealogie: {
    title:       'Généalogie & Traçabilité',
    icon:        '🌿',
    description: 'Recherche bidirectionnelle : d\'un lot PF vers ses matières premières (amont), ou d\'un lot MP vers tous les PF qui l\'ont utilisé (aval). Document d\'audit complet.',
    tips: [
      'Recherchez par n° de lot PF pour voir tous les composants utilisés.',
      'Recherchez par n° de lot MP pour identifier tous les produits finis impactés (rappel produit).',
      '"Exporter PDF" génère le dossier de lot complet pour un audit ou une autorité sanitaire.',
      'Les CCP hors spec apparaissent en rouge — action immédiate requise.',
    ],
    glossary: [
      { term: 'Amont',  def: 'Traçabilité vers les matières premières (qui a fourni ce composant ?)' },
      { term: 'Aval',   def: 'Traçabilité vers les clients (où est parti ce lot ?)' },
      { term: 'Rappel', def: 'Procédure de retrait d\'un lot du marché — nécessite la traçabilité aval' },
    ],
  },

}
