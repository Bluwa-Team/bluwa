// Contenu aide contextuelle — une entrée par écran/flux.
// Miroir de mobile/constants/help.ts

class HelpContent {
  const HelpContent({
    required this.titre,
    required this.resume,
    required this.etapes,
    this.tips = const [],
    this.videoUrl,
  });

  final String titre;
  final String resume;
  final List<String> etapes;
  final List<String> tips;
  final String? videoUrl; // YouTube non-listé ou Cloudflare Stream

  static const Map<String, HelpContent> all = {
    // ── Réception ─────────────────────────────────────────────────────────
    'reception_liste': HelpContent(
      titre: 'Réceptions fournisseurs',
      resume:
          "Cet écran liste toutes les livraisons et collectes réalisées. Tu peux filtrer par flux (BC / BA) et par statut, ou lancer une nouvelle réception.",
      etapes: [
        'Appuie sur le bon flux selon la livraison attendue',
        'Remplis le formulaire de réception',
        'Valide — un lot qualité est créé automatiquement',
        "Le responsable qualité prend le relai pour l'analyse",
      ],
      tips: [
        'BC = livraison avec facture (GIE, coopérative formel)',
        'BA planifié = livraison sans facture, commande déjà créée',
        'BA direct = achat spontané sur le terrain, prix du jour',
      ],
    ),
    'reception_bc': HelpContent(
      titre: 'Réception sur Bon de Commande',
      resume:
          'Tu réceptionnes une livraison liée à une commande fournisseur existante. Ce flux génère une facture fournisseur dans l\'ERP.',
      etapes: [
        'Sélectionne le BC ouvert qui correspond à la livraison',
        'Saisis la quantité physiquement reçue sur le camion',
        'Note le numéro de lot fournisseur et la DLC marquée sur les sacs',
        'Renseigne le numéro de bordereau de livraison (BL)',
        'Apprécie la qualité visuelle : Conforme, Réserve ou Non jugée',
        "Valide — un lot qualité 'En contrôle' est créé automatiquement",
      ],
      tips: [
        'Si la quantité reçue est inférieure à la commande, valide quand même — le reliquat reste ouvert sur le BC',
        "En cas de doute visuel, choisis 'Réserve' — le lot sera bloqué en attente d'analyse labo",
      ],
    ),
    'reception_ba_planifie': HelpContent(
      titre: 'Réception sur BA planifié',
      resume:
          "Le Bon d'Achat a été créé en avance par le bureau. Pas de facture — le paiement est direct (mobile money ou espèces).",
      etapes: [
        'Sélectionne le BA planifié correspondant au producteur',
        'Saisis la quantité réellement reçue',
        'Note la date ou référence lot du producteur',
        'Choisis le moyen de paiement utilisé (Wave, Flooz, Cash…)',
        'Apprécie la qualité et valide',
      ],
      tips: [
        'Le montant du paiement est calculé automatiquement depuis le BA',
        'Sans facture : le producteur signe le BA comme reçu de paiement',
      ],
    ),
    'reception_ba_direct': HelpContent(
      titre: 'Achat direct spontané',
      resume:
          "Un producteur se présente sans rendez-vous. Tu crées le Bon d'Achat sur le moment au prix du jour.",
      etapes: [
        'Saisis le nom du producteur ou groupement',
        'Choisis le moyen de paiement',
        'Sélectionne la matière première achetée',
        'Saisis la quantité et le prix unitaire du jour (FCFA/t)',
        'Le montant total est calculé automatiquement',
        "Valide — un BA est généré automatiquement dans l'ERP",
      ],
      tips: [
        "Le prix du jour doit correspondre au tarif validé par le responsable achat",
        'Prends une photo de la marchandise avant déchargement si possible',
      ],
    ),

    // ── Qualité ───────────────────────────────────────────────────────────
    'qualite_liste': HelpContent(
      titre: 'Contrôle qualité',
      resume:
          "Liste des lots en attente d'analyse. Chaque réception crée automatiquement un lot 'En attente'. Tu dois analyser et décider : Libérer ou Bloquer.",
      etapes: [
        "Appuie sur un lot 'En attente' pour l'analyser",
        'Saisis les résultats de laboratoire (humidité, impuretés…)',
        'Prends des photos si nécessaire',
        'Prends ta décision : Libérer ou Bloquer + NC',
      ],
      tips: [
        'Un lot libéré est disponible pour la production',
        "Un lot bloqué reste en quarantaine jusqu'à décision finale",
      ],
    ),
    'qualite_controle': HelpContent(
      titre: "Analyse d'un lot",
      resume:
          "Saisis les résultats de tes mesures physiques et chimiques. L'app t'alerte si une valeur dépasse le seuil acceptable.",
      etapes: [
        'Identifie le lot (numéro Bluwa + numéro fournisseur)',
        "Mesure l'humidité avec l'humidimètre et saisis le résultat",
        "Mesure le taux d'impuretés et la granulométrie si applicable",
        "Prends des photos de l'état visuel de la marchandise",
        'Note tes observations (odeur, couleur, aspect…)',
        'Libère si tout est conforme, ou ouvre une NC si problème',
      ],
      tips: [
        'Humidité : seuil ≤ 14 % — au-delà, risque de moisissure',
        'Impuretés : seuil ≤ 3 % — au-delà, perte de rendement',
        'En cas de doute, consulte le responsable qualité avant de décider',
      ],
    ),
    'qualite_nc': HelpContent(
      titre: 'Fiche Non-Conformité',
      resume:
          'Une NC documente officiellement un problème qualité. Elle sert de base pour le litige fournisseur et le suivi des actions correctives.',
      etapes: [
        'Sélectionne le type de défaut constaté',
        'Décris précisément le problème observé',
        'Ajoute des photos comme preuves (obligatoire pour un litige financier)',
        "Choisis l'action corrective : retour, destruction ou remise",
        'Indique le montant de la réclamation financière si applicable',
        'Enregistre — le lot est bloqué et la NC remonte au responsable',
      ],
      tips: [
        'Sans photos, le fournisseur peut contester le litige',
        'Le montant réclamé doit être validé par le responsable avant envoi au fournisseur',
      ],
    ),

    // ── Production ────────────────────────────────────────────────────────
    'of_liste': HelpContent(
      titre: 'Ordres de Fabrication',
      resume:
          'Liste des ordres de fabrication planifiés et en cours. Chaque OF correspond à une production à réaliser avec une quantité cible et une recette définie.',
      etapes: [
        'Consulte les OF du jour — filtre par statut si nécessaire',
        'Appuie sur un OF pour voir les détails et les actions disponibles',
        'Lance le picking des composants avant de démarrer la production',
        'Utilise le tableau de bord MES pendant la production',
      ],
      tips: [
        "Un OF 'En attente composants' = les matières premières ne sont pas encore prélevées",
        'Ne démarre pas la production sans avoir validé le picking',
      ],
    ),
    'of_picking': HelpContent(
      titre: 'Préparation des composants (Picking)',
      resume:
          'Avant de démarrer la production, tu dois prélever physiquement les matières premières et les consommables dans le stock.',
      etapes: [
        'Lis la liste des composants nécessaires',
        'Va chercher chaque composant dans sa zone de stockage',
        'Scanne le code-barres du lot prélevé pour confirmer le bon lot',
        'Saisis la quantité réellement prélevée',
        'Répète pour chaque ligne — la barre de progression avance',
        'Valide le picking quand tous les composants sont prêts',
      ],
      tips: [
        'Prélève toujours le lot le plus ancien en premier (FIFO)',
        "Si le code-barres ne correspond pas, n'utilise pas ce lot — alerte le responsable",
        "Le bouton 'Valider' reste grisé tant qu'une ligne n'est pas complète",
      ],
    ),
    'of_mes': HelpContent(
      titre: 'Tableau de bord MES',
      resume:
          'Le MES (Manufacturing Execution System) te permet de suivre la production en temps réel : déclarations de production, arrêts, rebuts et clôture CCP.',
      etapes: [
        "Appuie sur 'Déclarer' pour saisir la quantité produite depuis la dernière déclaration",
        "En cas d'arrêt machine, appuie sur 'Arrêt' et choisis le motif",
        "Reprends la production avec 'Reprendre' quand le problème est résolu",
        "Si des produits sont non conformes, déclare un 'Rebut' avec le motif",
        'En fin de lot, clôture avec les mesures CCP HACCP',
      ],
      tips: [
        'Déclare régulièrement — ne pas attendre la fin de production',
        "Chaque arrêt doit avoir un motif — c'est obligatoire pour les statistiques",
        "Le journal en bas de l'écran montre tout l'historique du lot",
      ],
    ),
    'of_ccp': HelpContent(
      titre: 'Clôture CCP HACCP',
      resume:
          'Les CCP (Critical Control Points) sont des mesures obligatoires HACCP à enregistrer en fin de production pour libérer le lot fini.',
      etapes: [
        'Mesure le pH du produit fini et saisis la valeur',
        'Vérifie et saisis la température de pasteurisation atteinte',
        "Mesure le Brix (concentration en sucre) à l'aide du réfractomètre",
        'Saisis la température de refroidissement',
        "Toutes les valeurs doivent être dans les normes — l'app valide en temps réel",
        'Clôture quand tous les indicateurs sont verts',
      ],
      tips: [
        'pH cible : 2,8 – 3,8',
        'Temp. pasteurisation : ≥ 85 °C',
        'Brix : 12,0 – 16,0 °Bx',
        'Temp. refroidissement : ≤ 25 °C',
        'Si une valeur est hors norme, stoppe et appelle le responsable qualité',
      ],
    ),

    // ── Inventaire ────────────────────────────────────────────────────────
    'inventaire': HelpContent(
      titre: 'Inventaire physique',
      resume:
          "L'inventaire compare le stock théorique (ce que dit le système) avec le stock physique réel. Les écarts sont enregistrés et remontent au responsable.",
      etapes: [
        "Ouvre un document d'inventaire existant ou crée-en un nouveau",
        'Va physiquement compter chaque article dans sa zone',
        'Saisis la quantité comptée pour chaque ligne',
        'Sauvegarde régulièrement — tu peux reprendre plus tard',
        'Quand toutes les lignes sont comptées, valide les écarts',
      ],
      tips: [
        'Compte sans regarder la quantité théorique pour éviter les biais',
        'Si un écart est important, recompte avant de valider',
        "Un écart validé ajuste le stock automatiquement dans l'ERP",
      ],
    ),

    // ── Ventes ────────────────────────────────────────────────────────────
    'ventes_liste': HelpContent(
      titre: 'Commandes clients',
      resume:
          'Liste des commandes clients avec leur statut. Suit le cycle DRAFT → Confirmée → En préparation → Expédiée → Facturée.',
      etapes: [
        'Consulte les commandes en attente de traitement',
        'Appuie sur une commande pour voir le détail et les articles',
        "Avance le statut selon l'avancement réel",
        'Alerte rouge = date de livraison dépassée, à traiter en priorité',
      ],
      tips: [
        "Une commande DRAFT n'est pas encore confirmée côté client",
        "Seul le responsable commercial confirme une commande depuis l'ERP",
      ],
    ),
    'ventes_new': HelpContent(
      titre: 'Prise de commande terrain',
      resume:
          'Saisis une commande client directement sur le terrain lors d\'une visite. Elle est créée en DRAFT et doit être confirmée par le bureau.',
      etapes: [
        'Sélectionne le client dans la liste',
        'Indique la date de livraison souhaitée par le client',
        'Choisis la devise (XOF par défaut)',
        'Ajoute les articles commandés avec quantité et prix unitaire',
        'Note une remise commerciale si accordée',
        "Crée la commande — elle remonte automatiquement dans l'ERP",
      ],
      tips: [
        "Le CA prévisionnel s'affiche en bas avant de valider",
        "Tu peux ajouter plusieurs lignes d'articles dans une même commande",
        'La commande reste DRAFT jusqu\'à confirmation par le responsable',
      ],
    ),
  };
}
