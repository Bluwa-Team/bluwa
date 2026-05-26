# Journal des modifications — Bluwa ERP

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
Versions sémantiques dès le premier déploiement Supabase. En attendant : dates ISO.

---

## [2026-05-25] — Session initiale

### Environnement
- Ajout de `.env.local` dans `frontend/` avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`

### Page Approvisionnement
- **Fix** : colonne `Article` du tableau Commandes sans `ColumnResizer` — ajout de `relative` + `<ColumnResizer>` dans le `<th>`
- **Fix** : colonne `Article` avec `defaultWidth: null` rendait le redimensionnement inerte (`startResize` retournait immédiatement pour les colonnes null) — changé en `defaultWidth: 200, minWidth: 150`; nettoyage de la constante `ARTICLE_MIN` et du calcul `tableMinWidth`
- **Ajout** : modal `Nouvelle Commande Fournisseur` (`_components/commande-modal.tsx`)
  - Sélecteur de type en deux grandes cartes : Formel → BC (`Building2`) / Informel → BA (`Leaf`)
  - Champs : Fournisseur, N° Contrat cadre (désactivé si BA), Article, Quantité, Unité, PU HT (XOF), Livraison prévue
  - Info box orange dynamique (texte et préfixe BC/BA) avec icône `Printer`
  - Bouton "Créer & imprimer BC/BA" dynamique
  - Génération automatique du numéro (`BC-YYYY-NNN` / `BA-YYYY-NNN`) à la sauvegarde
- **Type** : ajout de `puHT: number | null` sur `CommandeFournisseur` + mise à jour des 6 entrées `MOCK_COMMANDES`

### Page Réception
- **Ajout** : modal `Nouvelle Réception` (`_components/reception-modal.tsx`)
  - Sélecteur de commande à réceptionner (filtre EnCours/Partielle) avec pré-remplissage automatique (fournisseur, article, quantité restante)
  - Carte info bleue auto-remplie après sélection de commande
  - Champs : Qté reçue, Humidité (%), N° lot fournisseur (obligatoire), DLC, Code-barres/DataMatrix + bouton Scanner (`Barcode`)
  - Statut visuel avec composant `Select` shadcn + icônes Lucide (`Clock` / `CheckCircle2` / `AlertTriangle`)
  - Zone upload photos (`Camera`) en pointillés
  - Note QC (`ShieldCheck`) : lot en "En contrôle" à la validation
  - Tous les champs désactivés tant qu'aucune commande n'est sélectionnée
  - Génération automatique du numéro `REC-YYYY-NNN` et du lot interne `LOT-XXX-NNN`
- **Type** : ajout de `humidite: number | null` sur `Reception` + mise à jour des 4 entrées `MOCK_RECEPTIONS`

### Architecture & Charte
- Définition des **6 valeurs cardinales** du projet (sauvegardées en mémoire) :
  1. Rigueur du code, simplicité de l'écran
  2. Le terrain a toujours raison
  3. Focus Commando (Phase 1 : MDM, Achats, Stocks, GPAO, Qualité)
  4. Mode dégradé par design (Offline-First)
  5. Souveraineté de la donnée & vérité du lot
  6. Ergonomie opérationnelle absolue
- Conception du schéma PostgreSQL MDM (tables `articles`, `lots`, `mouvements_stock`, trigger PMP, séquences `TYPE-XXXX`) — **non exécuté sur Supabase**
- **Décision** : continuer en mock data TypeScript jusqu'à validation complète des écrans Phase 1 (Option B)

---

## [2026-05-25] — Session 2

### Page MRP
- **Fix formule** : `calcMRP` — suppression de `- p.ofPlanif` dans le calcul du besoin net. Formule corrigée : `besoinNet = max(0, max(cmdFerme, prevision) - stockPF + stockSec)`
- **Ajout** : `ofPlanifQte` dans `MRPResult` = `nbOP × tailleLot` (besoin net arrondi à la taille de lot supérieure)
- **Fix colonne "OF planif."** : affiche désormais `ofPlanifQte` (quantité planifiée calculée) au lieu de `p.ofPlanif` (OF existants en input)
- **Fix MAI 26** (tab ③ Composants 6 mois) : colonne M+0 remplie avec l'explosion BOM du M+0 corrigé (1 960 btl au total, taux BOM déduits de `MOCK_BOM`)
- **Fix décimales infinies** (tab ③) : helper `r2 = Math.round(n * 100) / 100` appliqué sur chaque valeur et sur le total — fin du bug `255.84999999999997`
- **Fix affichage zéros** : besoin net = 0 s'affiche `0` (muted) au lieu de tiret ou cellule vide ; même correction dans tab ③ (`'·'` → `0`)
- **Fix note de formule** pied de tableau ① : mise à jour pour refléter la formule corrigée et la définition de OF Planif
- **Architecture** : 6 valeurs cardinales sauvegardées en mémoire projet ; décision Option B (mock data jusqu'à validation des écrans Phase 1)

---

## [2026-05-25] — Session 3

### Page Ordres de Fabrication (module Production)
- **Ajout** : route `/production` + `_components/types.ts`
  - Type `StatutOF` : `EnAttenteComposants | Planifie | EnCours | ControleQualite | Dispo | Termine`
  - Type `StatutPicking` : `AValider | Valide`
  - Interface `OrdreFabrication` : numero, produitFini, sku, qty, realise, unite, lotPF, ligne, operateurPrep, dateBesoin, debutPlanif, picking, statut, archive
  - Maps `STATUT_OF_LABELS`, `STATUT_OF_COLORS`, `STATUT_OF_TRANSITION`, `STATUT_OF_NEXT`
  - `MOCK_OFS` : 5 entrées (OF-2026-041 à 045, dont 1 archivée)
- **Ajout** : page `production/page.tsx`
  - 4 cartes stat à bordure top colorée : OF ACTIFS · À PRODUIRE · DISPO (STOCK OK) · TAUX DE REBUT
  - Toggle vue : Liste | Vue par période (3 mois) [stub]
  - Onglets filtre statut avec compteur dynamique par statut
  - Bouton Archives avec badge compteur
  - Tableau redimensionnable 12 colonnes (N° OF, Produit fini, Qté, Réalisé, Lot PF, Ligne, Opérateur prép., Date besoin, Début planif., Picking, Statut, Action)
  - Barre de progression avancement par OF (orange/bleu/vert selon %)
  - Picking : badge vert "Validé" ou bouton "Valider picking"
  - Statut : pills colorés avec icônes (Factory, FlaskConical, PackageCheck)
  - Colonne Action : bouton de transition contextuel (Planifier → Lancer → Finir prod → Libérer → Archiver) + Pencil + Printer
  - Transitions d'état mock (useState local)
- **Sidebar** : ajout lien "Ordres de fabrication" (enabled) avec icône `Factory` en tête du groupe Production
- **i18n** : ajout de `ordresFabrication` dans `fr.json` et `en.json`
- **Fix** : `reception-modal.tsx` — `onValueChange` du Select Base UI retourne `string | null`; ajout guard `if (v !== null)` pour satisfaire le type du setter

### Standardisation globale des tableaux
- **Règle casse** : suppression de la classe Tailwind `uppercase` sur tous les `<th>` de l'ensemble des tableaux — les titres de colonnes sont maintenant en casse de phrase (ex. `N° lot`, `Désignation`, `Statut QC`)
- **Règle redimensionnement** : toutes les colonnes sont désormais redimensionnables — fin de `defaultWidth: null` sur toutes les colonnes flexibles, chaque `<th>` possède désormais un `<ColumnResizer>`
- **Colonnes fixées** : `designation` (Stocks), `article` (Approvisionnement Stratégie), `article` (Réception), `produit` (MRP tab ①), `composant` (MRP tab ②), `produitFini` (Production) → toutes passées à `defaultWidth: 200–220, minWidth: 160`
- **MRP tabs ③④** : ajout de `HORIZON_COMP_COLUMNS`, `HORIZON_PF_COLUMNS` + hooks `useResizableColumns` dédiés (`w3/sr3`, `w4/sr4`) — les tableaux "Composants 6 mois" et "OP 6 mois" sont maintenant pleinement redimensionnables
- **Constantes supprimées** : `DESIGNATION_MIN`, `STRATEGIE_ARTICLE_MIN`, `ARTICLE_MIN`, `PRODUIT_MIN`, `COMPOSANT_MIN` — les formules `tableMinWidth` sont simplifiées en `sum + (widths[id] ?? defaultWidth ?? 0)`
- **Fichiers modifiés** : `stocks/page.tsx`, `approvisionnement/page.tsx`, `reception/page.tsx`, `mrp/page.tsx`, `production/page.tsx`

### Vue par période (3 mois) — Ordres de Fabrication
- **Implémentation** : `vue === 'periode'` remplace le stub — grille 3 colonnes responsives (md:grid-cols-3)
- **Navigation** : boutons ← / Aujourd'hui / → avec état `monthOffset`; `MOIS_FR` array pour labels localisés
- **Colonnes** : groupage par mois de `debutPlanif`; en-tête avec compteurs (n OF · btl planifiées · dispo)
- **Cartes OF** : n° OF + pill statut · désignation produit · icône Calendar + date début + quantité
- **État vide** : "Aucun OF" en italique centré
- **Données mock** : restructuration pour coller à la maquette — OF-042 Vanille/ControleQualite, OF-043 Gingembre/EnCours, OF-044 Menthe/Planifie, OF-045 Citronnelle/EnAttenteComposants; `debutPlanif` début mai 2026 → 550 btl en mai, 0 en juin/juillet

---

## [2026-05-25] — Session 4

### Page MES — Suivi de fabrication (module Production)
- **Ajout** : route `/production/mes` + page `mes/page.tsx`
  - 4 cartes stat à bordure top colorée : Lignes actives · Btl produites aujourd'hui · Taux moyen d'avancement · Arrêts actifs
  - Horloge temps réel (HH:MM via `useEffect` + `setInterval`) + badge "En direct" animé
  - Section **Lignes en production** : cartes OF avec bordure gauche colorée (vert = actif, rouge = arrêt)
    - Indicateur de progression (barre + pourcentage + qtés)
    - Cadence prévue (btl/h) et durée restante estimée (`fmtDurationH`)
    - Dernière déclaration (heure + qte + opérateur)
    - Boutons : Déclarer production · Signaler arrêt / Reprendre · Finir production
  - Section **File de lancement** : cartes compactes pour OFs `Planifie` + bouton Lancer
  - Section **En attente composants** : encart orange d'information si des OFs bloqués existent
  - **Journal MES** : tableau redimensionnable 6 colonnes (Heure · N° OF · Ligne · Événement · Détail · Opérateur) avec badges colorés par type d'événement
  - **Modal Déclarer production** : input quantité + warning dépassement planifié, touche Entrée pour valider
  - **Modal Signaler arrêt** : sélecteur motif (6 motifs) + commentaire optionnel + bouton rouge
- **Types** ajoutés dans `types.ts` :
  - `EtatLigne`, `MotifArret`, `MOTIF_ARRET_LABELS`
  - `SessionMES` (ofId, etat, debutReel, derniereDecl)
  - `TypeEvenementMES`, `EvenementMES`
  - `MOCK_SESSIONS_MES` (session initiale pour OF-043)
  - `MOCK_JOURNAL_MES` (4 entrées : lancement + déclaration + fin OF-042 + lancement OF-042)
- **Sidebar** : ajout lien "Suivi de fabrication" (`/production/mes`, icône `MonitorPlay`, enabled)
- **i18n** : ajout `mes` dans `fr.json` ("Suivi de fabrication") et `en.json` ("Production Monitoring")

---

## [2026-05-26] — Session 5

### Architecture — Couche de configuration partagée (`src/config/`)

- **Ajout** : dossier `frontend/src/config/` avec 5 modules et un barrel export `index.ts`
  - `geo.ts` : `PAYS` (22 pays Afrique de l'Ouest + Europe + Asie), `SECTEURS`, `LANGUES`
  - `devises.ts` : `DEVISES` (XOF, XAF, EUR, USD, GBP)
  - `incoterms.ts` : `INCOTERMS` fusionné (anciens `INCOTERMS_CLIENT` + `MODES_LOGISTIQUE` — doublons supprimés, CPT ajouté)
  - `entrepots.ts` : `ENTREPOTS` extrait de `stocks/_components/types.ts`
  - `conditions-paiement.ts` : `CONDITIONS_PAIEMENT` + `TRANSPORTS`
- **Refacto** : `clients/_components/types.ts` → re-exports depuis `@/config` sous alias legacy (`PAYS_CLIENTS`, `INCOTERMS_CLIENT`, etc.) — zéro breaking change
- **Refacto** : `fournisseurs/_components/types.ts` → re-exports depuis `@/config` (`PAYS_AFRIQUE_OUEST`, `DEVISES`, `MODES_LOGISTIQUE`)
- **Refacto** : `stocks/_components/types.ts` → re-export `ENTREPOTS` depuis `@/config`

### Architecture — Refonte Header/Item (pattern ERP EKKO/EKPO)

#### Module Approvisionnement
- **Refacto** `approvisionnement/_components/types.ts` : remplacement de l'interface plate `CommandeFournisseur` par la structure Header/Item
  - `BCHeader` : id, numero, type (BC/BA), date, fournisseur, contrat, reception, statut
  - `BCItem` : id, headerId, article, quantite, quantiteRecue, unite, puHT, livraisonPrevue, dureeVie
  - `BCFlat` : vue aplatie Header × Item — `flattenBC()` comme helper
  - `type CommandeFournisseur = BCFlat` conservé pour rétrocompatibilité
  - `MOCK_BC_HEADERS` (6 entrées) + `MOCK_BC_ITEMS` (6 entrées, une par header)
- **Refacto** `approvisionnement/page.tsx` : état splitté en `bcHeaders[]` + `bcItems[]`; vue plate dérivée via `useMemo(flattenBC)`, clé de tableau `${c.id}-${c.itemId}`

#### Module Réception
- **Refacto** `reception/_components/types.ts` : remplacement de l'interface plate par Header/Item
  - `ReceptionHeader` : id, numero, date, numeroBon, fournisseur, typeFournisseur, statut, cloturee
  - `ReceptionItem` : id, headerId, article, quantite, unite, lot, lotFourn, dlc, humidite, codeBarres, statutLot
  - `ReceptionFlat` + `flattenReception()` + alias `type Reception = ReceptionFlat`
  - `MOCK_RECEPTION_HEADERS` (4 entrées) + `MOCK_RECEPTION_ITEMS` (4 entrées)
- **Refacto** `reception/page.tsx` : état `recHeaders[]` + `recItems[]`; stats calculées sur `recHeaders` (évite le double-comptage multi-articles)

### Modals — Refonte visuelle Header/Item

#### `commande-modal.tsx` (réécriture complète)
- Section ① En-tête : sélecteur BC/BA en grandes cartes, Fournisseur, N° Contrat cadre, Date livraison défaut (propagée aux lignes)
- Section ② Lignes articles : tableau multi-lignes 7 colonnes (Article, Quantité, Unité, PU HT, Livraison prévue, Durée vie, ×)
- Bouton "+ Ajouter une ligne" + suppression par ligne
- Propagation intelligente de la date défaut (ne remplace pas les dates custom)
- Compteur de lignes dans le footer

#### `reception-modal.tsx` (réécriture complète)
- Section ① Sélecteur BC/BA : liste filtrée sur statut `EnCours | Partielle`, badge nb articles + qté restante
- Section ② Par article BC : formulaire de réception indépendant par ligne (Qté reçue, Lot fourn., DLC auto-calculée, Humidité, Code-barres, Statut lot)
- Dérivation automatique du statut global : `Bloqué → Réserve`, `all lotFourn → Conforme`, sinon `Attente`
- Badge statut global dans le footer

---

## [2026-05-26] — Session 6

### Logique métier — Modal commande fournisseur (référentiels Master Data)

#### Champ Fournisseur → liste déroulante dynamique
- Chargement via `getFournisseurs()` à l'ouverture du modal
- `<select>` groupé par `<optgroup>` : **Formel (→ BC)** / **Informel (→ BA)**
- Spinner "Chargement du référentiel…" pendant le fetch
- Sélection auto-positionne le type BC/BA selon `fournisseur.statut`

#### Remontée automatique du Contrat cadre
- Dès qu'un fournisseur Formel est sélectionné : appel `getContratActifByFournisseur(fournisseurId)`
- Contrat trouvé → pré-rempli, icône 🔒, fond vert, lecture seule + label *"Contrat cadre actif détecté"*
- Contrat absent → champ éditable + label *"Aucun contrat actif — saisie manuelle"*
- Spinner dans le champ pendant la requête

#### Champ Article → liste déroulante par ligne
- Chargement via `getArticles()` filtré `appro === 'Achete'` (seuls les articles achetables)
- `<select>` groupé par type : MP → AC → CS → PSF → PF
- Sélection auto-remplit **Unité** (`article.uniteStock`) et **Durée de vie** (`article.dureeVie`)
- Les deux champs restent éditables après auto-fill

#### Nouveaux fichiers
- **`lib/actions/approvisionnement.ts`** : server action `getContratActifByFournisseur(fournisseurId)`
  - Requête `contrats_achat` : filtre `organization_id`, `fournisseur_id`, `statut='Actif'`, plage de dates incluant aujourd'hui
  - Dégradation silencieuse si la table n'existe pas encore en base
  - Schéma SQL `contrats_achat` documenté en commentaire (prêt à migrer)
- **`fournisseurs/_components/types.ts`** : ajout de `fournisseurId: string` sur `ContratAchat` (FK vers `fournisseurs.id`)

### Audit architectural — Conformité SAP (MANDT / T001W / MARC / EKKO-EKPO)

- **Audit complet** de la migration `002_erp_tables.sql` et des server actions contre le modèle SAP
- **5 maillons manquants identifiés** :
  1. Table `factories` non versionnée (absente des migrations, créée à la main dans Supabase Studio)
  2. `profiles.factory_id` hardcodé à `null` lors de l'onboarding (bug `auth.ts` l.101)
  3. Stock global au tenant — `stocks` sans `factory_id` (pas d'équivalent MARC)
  4. `entrepots` sans `factory_id` — pas rattachés à un site physique
  5. Tables EKKO/EKPO (`commandes_achat_headers` + `commandes_achat_lignes`) absentes en base ; `BCHeader.fournisseur` est un string texte sans FK
- **Migration 003 proposée** (non appliquée) : versionnement `factories`, colonnes `factory_id` sur `stocks`/`entrepots`/`mouvements_stock`, tables `commandes_achat_headers` + `commandes_achat_lignes` + `contrats_achat` avec RLS complète
- **Fix immédiat identifié** dans `auth.ts` : `factory_id: null` → `factory_id: factory.id`

---

## À venir

### Phase 1 — Écrans restants à construire ou compléter
- [ ] Dashboard — brancher les KPI cards sur les vraies données (mock d'abord)
- [ ] Articles — revoir la codification TYPE-XXXX (`MP-0001`, `PSF-0042`…)
- [ ] Stocks — connecter `MOCK_LOTS` sur les vraies tables lots (FEFO/FIFO)
- [ ] MRP — stub à implémenter
- [ ] Analyse de marge — stub à implémenter
- [ ] Paramètres — page non implémentée
- [x] Production OF — modal "Nouvel OF" (formulaire complet + câblage page)

### Dette technique identifiée
- [ ] Colonne `Article` (onglet Stratégie, page Approvisionnement) : même bug `defaultWidth: null` que corrigé sur Commandes
- [ ] Pas de système de notifications (toast) — les erreurs d'actions sont silencieuses
- [ ] Pas de pagination sur les requêtes liste (`getArticles`, `getClients`…)
- [ ] Bouton de déconnexion absent du sidebar
- [ ] Aucun test (unitaire ou E2E)
- [ ] Import/export CSV : boutons présents mais sans handlers
- [ ] `profiles.factory_id` hardcodé à `null` à l'onboarding (`auth.ts` l.101) — fix trivial, voir Session 6
- [ ] Migration 003 à appliquer en Supabase (tables EKKO/EKPO, `factory_id` sur stocks/entrepots, `contrats_achat`)
- [ ] `BCHeader.fournisseur` est un string texte — migrer vers `fournisseur_id UUID` une fois migration 003 appliquée
- [ ] Table `factories` à versionner dans une migration (actuellement créée à la main dans Supabase Studio)
