# Journal des modifications — Bluwa ERP

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
Versions sémantiques dès le premier déploiement Supabase. En attendant : dates ISO.

---

## [2026-06-01] — Session 16 — Modales S&OP + Section Abonnement + doc guide modules

### Module S&OP — Modales de détail

#### `demande-clients/page.tsx`
- **Ajout** : modale `OrderDetailModal` — s'ouvre au clic sur n'importe quelle ligne de commande
  - En-tête : n° commande (monospace) + badge statut (Confirmée / En cours / Brouillon)
  - Blocs détail : Client · Article (libellé + code) · Quantité + unité · Date de livraison exacte
  - Les lignes passent de `<div>` à `<button>` avec `cursor-pointer` et `hover:bg-muted/10`
- **Import** : `DemandPlanLine` exporté depuis `demand-plan.ts` (type manquant)

#### `supply-planning/page.tsx`
- **Ajout** : modale `CellDetailModal` — s'ouvre au clic sur une cellule colorée (ignoré si `totalDemand === 0`)
  - En-tête : badge statut (OK / Tension / Surcharge) + semaine + nom article + code monospace
  - Section **Décomposition de la demande** : prévisions vs commandes fermes, badge "retenu" sur la valeur `Math.max()`, explication de la règle de calcul
  - Section **Capacité de production** : barre de progression du taux d'utilisation, seuils OK / Tension (>85%) / Surcharge (>100%)
  - Alerte rouge si surcharge avec actions suggérées (heures supp., sous-traitance, décalage)
- Les cellules passent de `<div>` à `<button>` avec `hover:ring-2` et `active:scale-95`
- Message d'alerte surcharge globale mis à jour : *"Cliquez sur une cellule rouge pour voir le détail"*
- Légende bas de tableau : *"Cliquez sur une cellule pour voir le détail du calcul"*

### Paramètres — Section Abonnement

#### `lib/actions/factory.ts`
- **Ajout** : types `SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED'` et interface `FactorySubscription`
- **Ajout** : server action `getFactorySubscription(factoryId)` — lit `factories` jointé à `subscription_plans` ; retourne plan name, prix XOF, statut, date expiry, max users

#### `settings/_components/AbonnementSection.tsx` (nouveau)
- Section visuelle avec badge statut coloré : **Actif** (vert) · **Paiement en attente** (orange) · **Résilié** (rouge)
- Grille infos : plan + tarif mensuel XOF · compteur utilisateurs `X / max` · date de renouvellement
- Alerte orange si `PAST_DUE` avec lien `support@bluwa.io`
- Fallback propre si aucun abonnement configuré sur le site actif

#### `settings/page.tsx`
- Import `AbonnementSection` + `getFactorySubscription`
- Appel `getFactorySubscription(activeId)` en parallèle des autres requêtes
- `<AbonnementSection>` inséré entre la section Utilisateurs et les Préférences

### Document `bluwa_erp_guide_modules.docx` — mise à jour module S&OP

#### Prévisions
- Horizon corrigé : "4 à 12 semaines" → **"6 semaines glissantes"** (valeur réelle de l'app)
- Supprimé : *Comparaison prévisions vs ventes réelles*, *Indicateur de tendance*, *Alerte si écart* (non implémentés)
- Ajouté : saisie manuelle + enregistrement automatique, total 6 semaines par produit, transmission automatique au Supply Planning et MRP
- Exemple mis à jour : suppression de l'algorithme saisonnier automatique → saisie manuelle par le planificateur

#### Plan de demande (ex "Demande clients")
- Titre renommé : **"🛒 Demande clients"** → **"📋 Plan de demande"** (aligné sur la sidebar)
- Sous-titre et description mis à jour pour refléter le regroupement par semaine
- Features : groupement 6 semaines glissantes, KPIs unités/commandes, alerte S1-S2, 3 statuts visuels
- Supprimé : valeur monétaire totale (non affichée dans l'UI)

#### Supply Planning
- "En langage simple" : calcul automatique prévisions + commandes fermes, taux d'utilisation, alerte rouge si >100%
- Features : 3 niveaux OK / Tension (>85%) / Surcharge (>100%), barre de progression, alerte globale rouge
- Exemple : taux d'utilisation 121% + statut Surcharge affiché, décision manuelle du responsable

### Fix — dépendance `date-fns`
- `npm install date-fns` : package manquant des `node_modules` malgré sa présence dans `package.json`

---

## [2026-06-01] — Session 15 — Fixes auth & cohérence rôles

### `src/lib/actions/auth.ts` — `completeOnboardingAction` (3 bugs critiques corrigés)
- **Fix** : `factories` INSERT utilisait `location` (colonne inexistante) → remplacé par `code` (généré depuis le nom), `country` (défaut `'Sénégal'`), `city`
- **Fix** : `profiles` INSERT contenait `factory_id: null` (colonne inexistante dans le nouveau schéma) → supprimé
- **Fix** : `role: 'org_admin'` invalide (violait le CHECK constraint) → corrigé en `role: 'owner'`
- **Ajout** : INSERT dans `user_site_access` après création du profil — l'owner accède automatiquement à sa factory
- `generateFactoryCode()` : génère le code à partir des initiales du nom (ex. "Site Dakar" → "SD", max 5 chars)

### `src/app/[locale]/onboarding/page.tsx`
- `factoryLocation` → `factoryCity` pour correspondre au nouveau type de `completeOnboardingAction`

### `src/app/[locale]/(dashboard)/layout.tsx`
- **Fix** : `canUseAgent` vérifiait `'org_admin' | 'factory_admin' | 'super_admin'` (anciens rôles) → corrigé en `'owner' | 'admin'`

---

## [2026-06-01] — Session 14 — Nettoyage BDD & nouveau schéma

### Décision architecture (modèle validé)
- **Organisation = propriétaire de tout** : articles, fournisseurs, clients, factories sont liés à `organization_id`
- **Factory = opérateur** : agit au nom de l'org ; les commandes portent `organization_id` + `factory_id`
- **Territoire factory** : accès filtré via tables pivot `*_factory_links` (pas de `factory_id` sur les tables maîtres)
- **Recherche cross-factory à la création de commande** : fonctions SQL dédiées avec flag `est_lie`

### Migrations — restructuration complète
- **Supprimés** : migrations 002 à 017 (tables métier obsolètes ou incohérentes)
- **Nouveau `001_core_schema.sql`** : `organizations`, `factories` (avec `code`, `country`), `profiles` (sans `factory_id`), `user_site_access`
  - Rôles valides : `owner | admin | manager | operator | viewer`
  - Trigger `fn_handle_new_user()` : création automatique du profil à l'inscription
  - RLS séparée des CREATE TABLE (tables d'abord, politiques ensuite)
- **Nouveau `002_master_data.sql`** : `articles`, `article_factory_links`, `fournisseurs`, `fournisseur_factory_links`, `clients`, `client_factory_links`
  - Helpers SQL : `fn_user_org()`, `fn_user_factories()`, `fn_is_admin()`
  - Fonctions cross-factory : `search_clients_for_order()`, `search_fournisseurs_for_order()` avec flag `est_lie`
- **Ajout `cleanup_business_tables.sql`** : script de nettoyage à exécuter dans Supabase Studio

### Mémoire projet mise à jour
- Schéma BDD documenté (tables, colonnes, fonctions SQL, logique territoire)

---

## [2026-06-01] — Session 13 — Refonte UI Dashboard

### Dashboard `app/[locale]/(dashboard)/dashboard/page.tsx`

#### Palette & charts
- `globals.css` : `--chart-1..5` passés de gris oklch (chroma=0) à palette bleue (oklch avec chroma 0.12–0.23)
- `ChartConfig` : couleurs en `var(--chart-N)` (oklch direct) au lieu de `hsl(var(--chart-N))` (incompatible)

#### KPI Cards
- Composant `KpiDir` : `rounded-2xl p-4` → `rounded-xl p-3`, icones `w-8 h-8 rounded-lg`, inner card `rounded-lg px-3 py-2.5`
- Suppression du `py-4 gap-4` par défaut des `<Card>` via override `py-3 gap-2`

#### Jauge TRS semi-circulaire
- `TrsGauge` : SVG pur, 5 segments colorés (rouge/orange/jaune/bleu/vert), aiguille + pivot
- `TrsKpiCard` : intégrée à droite de la valeur numérique (`w-[72px] h-[42px]`)
- Fix arc : `sweep-flag=1` (sens horaire, demi-cercle supérieur)

#### PeriodPicker
- Composant `period-picker.tsx` : presets 7j/1m/3m/6m/1a + calendrier range (react-day-picker v10)
- Fix : `isSameDay(from, to)` évite la fermeture prématurée au premier clic
- Fix : pas d'`asChild` (base-ui ne le supporte pas) — `PopoverTrigger` stylisé directement
- État séparé `periodeCA` / `periodeStock` pour les deux graphiques

#### Alert animé
- `alert.tsx` réécrit avec `motion/react` (AnimatePresence + whileHover)
- Variantes : `default | destructive | warning | info | success`
- Style : fond dégradé `from-[couleur]-50 to-white` + icone carré pastel + `shadow-sm`
- Suppression du bouton dismiss

#### Analyse de marge
- 3 `MargeCard` individuelles (Vanille, Gingembre, Originale) à la place d'un bloc unique
- Dégradé `bg-gradient-to-br from-[couleur]-50 to-white` par sévérité
- `border-0 ring-0 shadow-none`, padding `p-3 gap-3`
- Texte cause tronqué avec `title={cause}` (tooltip natif)
- Layout : `Card` contenant les 3 MargeCards (`lg:col-span-3`) + Card Alertes (`lg:col-span-2`) côte à côte
- Lien "Détail →" en `text-primary` dans `CardAction row-span-1`

#### Nettoyage
- Suppression du bloc P&L prévisionnel
- Suppression des imports inutilisés (`Receipt`, `Badge`, `Separator`, `buttonVariants`)

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

## [2026-05-27] — Session 7

### Architecture DB — Schema Maître v1.0 (modèle gelé & validé)

#### Migration 009 — `009_master_schema_v1.sql`
- **Nouveau** : script de migration global (850 lignes) définissant l'architecture relationnelle définitive
- **Philosophie** : Fat Database, Thin Backend — contraintes, intégrité et automatisations portées en PostgreSQL
- **16 tables** créées, organisées en 4 sections :
  - `§1 SaaS & Identity` : `organizations`, `factories`, `profiles`, `user_site_access`
    - `UNIQUE(user_id, factory_id)` sur `user_site_access` — accès multi-sites (ex. gérante Dakar + Lomé)
    - Trigger `fn_handle_new_user()` — création automatique du profil à l'inscription Supabase Auth
  - `§2 Master Data` : `vendors`, `articles`, `article_stocks`
    - `CONSTRAINT unique_sku_par_tenant UNIQUE(organization_id, sku)` sur `articles`
    - `article_stocks` : paramètres MRP intégrés (`safety_stock`, `reorder_point`, `lead_time_days`, `mrp_type IN ('PD','VB','ND')`)
  - `§3 Flux Achats` : `purchase_orders`, `purchase_order_items`
    - Trigger `fn_update_po_total()` : recalcule `total_amount_ht` à chaque INSERT/UPDATE/DELETE sur les lignes
    - `shelf_life_days` sur les lignes BC (durée de vie minimale attendue à livraison)
  - `§4 Boucle Transactionnelle` : `production_orders`, `purchase_requisitions`, `goods_receipts`, `goods_receipt_items`, `quality_inspection_lots`, `vendor_invoices`, `vendor_invoice_items`
    - `vendor_invoices.amount_ttc GENERATED ALWAYS AS (amount_ht + amount_tax) STORED` — intégrité comptable garantie en DB
    - BR POSTED immuable : RLS UPDATE bloqué si `status = 'POSTED'`
    - Décision QC irréversible : RLS UPDATE bloqué si `status != 'EN_CONTROLE'`
    - Triple Concordance : `vendor_invoice_items` porte `quantity_ordered`, `quantity_received`, `quantity_invoiced` + `concordance_status`
  - `§5 Traçabilité MRP` : FK `purchase_order_items → purchase_requisitions` (lien BC ↔ DA MRP), ajoutée via `ALTER TABLE` après la création de `purchase_requisitions` pour respecter l'ordre des dépendances
- **53 index** couvrant toutes les colonnes de filtrage fréquent (`organization_id`, `factory_id`, `status`, `mrp_type`, `due_date`...)
- **62 RLS policies** — isolation multi-tenant complète via `fn_current_org_id()` (évite les sous-requêtes répétées)
- Helpers globaux : `fn_set_updated_at()` (trigger générique `updated_at`), `fn_current_org_id()` (résolution JWT)

#### Migration 010 — `010_contrats_achat.sql`
- **Nouveau** : table `contrats_achat` avec FK sur `fournisseurs(id)` (table active en production depuis migration 002)
- Colonnes : `reference`, `article`, `date_debut`, `date_fin`, `prix_unitaire DECIMAL(15,4)`, `quantite_min`, `unite`, `statut CHECK('Actif','Expire','EnNegociation')`
- Contraintes : `UNIQUE(organization_id, reference)` + `CHECK(date_fin > date_debut)`
- Index : `(organization_id, fournisseur_id)` + `(organization_id, statut, date_debut, date_fin)`
- RLS complète (select/insert/update/delete)

### Module Fournisseurs — Contrats câblés sur Supabase

#### Diagnostic préalable
- Audit via API REST Supabase : seules `fournisseurs`, `clients`, `organizations`, `profiles`, `factories` sont en base — migrations 003–008 jamais appliquées
- `contrats_achat` de migration 003 référençait `suppliers(id)` (inexistante) — FK corrigée vers `fournisseurs(id)` dans migration 010

#### `lib/actions/contrats.ts` (nouveau)
- `getContratsByFournisseur(fournisseurId)` — lecture filtrée par org + fournisseur, tri par `date_debut DESC`
- `createContrat(contrat)` — insert + retourne l'objet persisté avec son UUID réel
- `updateContrat(id, patch)` — patch partiel (prévu pour édition future)
- `deleteContrat(id)` — suppression sécurisée avec vérification `organization_id`

#### `fournisseurs/_components/contrat-modal.tsx` (nouveau)
- 3 sections : Identification (référence + statut), Période de validité (dates avec validation cohérence), Conditions tarifaires (prix + devise + qté min + unité)
- Validation front-end sur tous les champs obligatoires avant soumission
- Appelle `createContrat()` — reste ouvert si erreur serveur (pas de fermeture silencieuse)

#### `fournisseurs/[id]/page.tsx` — mise à jour
- **Fix** : bouton "Nouveau contrat" n'avait aucun `onClick` et `const [contrats]` était en lecture seule
- `useEffect` au montage → `getContratsByFournisseur(id)` avec état `contratsLoading`
- Skeleton "Chargement des contrats…" pendant la requête initiale
- `onSave` reçoit le contrat persisté (UUID Supabase) et l'ajoute au state local

### Module Clients — Grille tarifaire câblée sur Supabase

#### Diagnostic préalable
- `clients`, `grilles_tarifaires` déjà en Supabase (migration 002) ✅
- Actions `getClients`, `getClientById`, `createClient`, `updateClient` déjà complètes ✅
- `getClientById` chargeait déjà `grilles_tarifaires` mais l'onglet était **read-only** (aucun bouton d'ajout/suppression)

#### `lib/actions/clients.ts` — 3 nouvelles fonctions
- `upsertGrilleTarifaire(clientId, entry)` — exploite `UNIQUE(client_id, article_code)` via `.upsert()` : crée ou met à jour
- `deleteGrilleTarifaire(clientId, articleCode)` — suppression par clé composite
- `getArticlesLite()` — retourne les articles `Actif` de type `PF/PSF` pour l'autocomplete (code, désignation, `prix_vente`, unité)

#### `clients/_components/grille-tarifaire-modal.tsx` (nouveau)
- Charge les articles depuis Supabase au montage → `<datalist>` pour l'autocomplétion du code article
- Pré-remplit désignation + prix catalogue quand l'utilisateur sélectionne un article connu
- Avertissement ambre (non bloquant) si l'article a déjà un tarif — upsert expliqué à l'utilisateur
- Champs : article (code), désignation, prix négocié, devise

#### `clients/[id]/page.tsx` — mise à jour
- `grille` extrait dans un state local indépendant (mutable sans refetch)
- Bouton **"Ajouter un tarif"** + compteur dynamique dans l'onglet
- Colonne **Supprimer** (icône Trash2) sur chaque ligne — `disabled` avec opacité pendant la suppression en cours
- `onSave` fait un upsert local : remplace si l'article existait, ajoute sinon — cohérent avec le comportement DB

### Gamme de fabrication — Migration 008 surfacée dans l'UI

#### `articles/_components/gamme-edit-modal.tsx`
- **Ajout** : colonne **"Réglage (min)"** (`setupTimeMinutes`) entre "Lot (min)" et "Temp. (°C)"
- Input numérique par ligne câblé sur `updateRow(id, 'setupTimeMinutes', ...)`
- Largeurs uniformisées `w-[72px]` sur les 3 colonnes numériques
- Note de bas de tableau mise à jour : "Réglage = temps de réglage machine avant démarrage (Rüstzeit)"

#### `articles/_components/bom-edit-modal.tsx`
- **Ajout** : champ **"Nom de version"** (`versionName`) à côté de "Version BOM" — grille passée de 3 à 2×2 colonnes
- **Ajout** : colonne **"Rebut (%)"** (`scrapFactorPercentage`) dans le tableau des composants — distinct de la tolérance de pesée
- `addRow()` initialise `scrapFactorPercentage: 0`
- `handleSave` passe `versionName` + `baseQuantity` (= `batchSize`) dans le header
- Note mise à jour : "Tol. = variance pesée | Rebut = pertes process planifiées (≡ AUSSS SAP)"

### MRP — Paramètres migration 008

#### `mrp/_components/types.ts`
- **Ajout** : `MrpType = 'PD' | 'VB' | 'ND'` + `MRP_TYPE_LABELS`
- **Ajout** : champs `mrpType`, `safetyStock`, `reorderPoint` sur `ComposantBOM`
- `MOCK_BOM` mis à jour : 10 composants avec valeurs MRP réalistes (hibiscus=PD, sucre=VB, eau=ND, emballages=VB...)

---

## [2026-05-28] — Session 10

### Migration 013 — Production Outputs (Fin de production & Entrée stock PF)

#### `supabase/migrations/013_production_outputs.sql`
- **Nouvelle table `production_outputs`** : déclarations de fin de fabrication (≡ SAP CO11N / MB31)
  - Colonnes : `organization_id`, `factory_id`, `production_order_id` (FK RESTRICT), `article_id`, `output_number`, `status`, `quantity_produced`, `quantity_scrap`, `product_batch_number`, `expiry_date`, `declared_by` → **`auth.users(id)`** (fix vs original), `declared_at`, `confirmed_by`, `confirmed_at`, `posted_at`, `notes`, `created_at`, `updated_at`
  - `status CHECK ('DRAFT', 'CONFIRMED', 'POSTED')` — cycle de vie complet
  - **3 CHECK de cohérence** : qté > 0, CONFIRMED/POSTED requiert `confirmed_by + confirmed_at`, POSTED requiert `posted_at`, DLC > date déclaration
  - `CONSTRAINT unique_output_number_per_tenant` + `unique_product_batch_per_tenant`
  - RLS : UPDATE bloqué si POSTED (immuable) ; DELETE bloqué sauf DRAFT
  - Trigger `updated_at` ; 9 index (org, factory, OF, article, date DESC, batch, DLC ASC FEFO, partial pending, déclarant)
- **Corrections vs SQL fourni** : `users(id)` → `auth.users(id)` ; ajout `status` + cycle de vie ; `updated_at` + trigger ; RLS complète ; 9 index ; 3 CHECK de cohérence ; champs `confirmed_by/at`, `posted_at`, `notes`

### Câblage App — Types, Actions & Page Lots de production

#### `src/types/erp.ts` — section Production Outputs (migration 013)
- `ProductionOutputStatus = 'DRAFT' | 'CONFIRMED' | 'POSTED'`
- Interface `ProductionOutput` (tous les champs DB)
- Interface `ProductionOutputRow` : enrichie avec `articleLabel`, `articleSku`, `articleUnit`, `orderNumber`, `tauxRebut` (% calculé)
- `PRODUCTION_OUTPUT_STATUS_LABELS/COLORS`

#### `lib/actions/production-outputs.ts` (nouveau)
- `getProductionOutputs(filter?)` — toutes les déclarations avec JOIN `articles!article_id` + `production_orders!production_order_id`
- `getProductionOrdersForDeclaration()` — OFs RELEASED/IN_PROGRESS avec infos article (dont `duree_vie` pour auto-calcul DLC)
- `createProductionOutput(input)` — INSERT DRAFT + génération séquentielle `DP-YYYY-NNNN`
- `confirmProductionOutput(id)` — DRAFT → CONFIRMED ; enregistre `confirmed_by` (user JWT) + `confirmed_at`
- `postProductionOutput(id)` — CONFIRMED → POSTED ; enregistre `posted_at`
- `deleteProductionOutput(id)` — DELETE DRAFT uniquement (RLS guard double-vérif)
- Helper interne `resolveFactoryId()` — copié du pattern work-centers.ts

#### `lots/_components/declare-output-modal.tsx` (nouveau)
- **Section ①** : sélecteur OF (RELEASED/IN_PROGRESS) — auto-fill article + calcul DLC (`today + duree_vie`)
- **Section ②** : Qté produite + Qté rebuts ; indicateur taux rebut temps réel (vert / amber / rouge si > 5%)
- **Section ③** : N° Lot PF (suggestion `LOT-FIN-YYYYMMDD-01`, éditable) + DLC (éditable, min=today)
- **Section ④** : Notes libres (observations fin de ligne)
- Statut initial : DRAFT — info footer "à confirmer par le chef d'équipe"
- Erreur non silencieuse si lot PF déjà existant (contrainte UNIQUE DB)

#### `lots/page.tsx` (nouveau) — `/lots`
- **4 cartes stat** : En stock (POSTED count + total unités) · À comptabiliser (CONFIRMED) · Brouillons (DRAFT) · Taux rebut moyen % (rouge si > 5%)
- **Filtres pill** : Tous / Brouillon / Confirmé / Comptabilisé avec compteurs
- **Tableau 10 colonnes** resizable (`useResizableColumns 'bluwa:cols:lots-production'`) : N° Déclaration · Article PF · N° OF · Lot PF · Qté produite · Rebuts (+ % taux) · DLC (urgence FEFO) · Date déclaration · Statut · Actions
- **Actions par ligne** : DRAFT → Confirmer (amber) + Trash2 (supprimer) · CONFIRMED → Comptabiliser (émeraude) · POSTED → immuable
- Mise à jour **optimiste** : `setOutputs(prev => ...)` — pas de re-fetch
- Modal Nouvelle déclaration intégré

#### Sidebar
- Lien "Lots de production" → `/lots` : `disabled: false` (était `true`)

---

## [2026-05-28] — Session 9

### Migration 012 — Moteur MRP : Runs & Recommandations

#### `supabase/migrations/012_mrp_engine.sql`
- **Nouvelle table `mrp_runs`** : journal des passes de calcul MRP (≡ SAP MD01/MDRE)
  - Colonnes : `organization_id`, `factory_id`, `executed_at` (UTC), `executed_by_system`, `status`
  - `status CHECK ('RUNNING', 'SUCCESS', 'FAILED')` — `DEFAULT 'RUNNING'` pour les passes asynchrones
  - RLS : SELECT + INSERT libres (par org) ; UPDATE restreint aux runs `RUNNING` uniquement — un run SUCCESS/FAILED est **immuable** (audit trail)
  - 4 index : org, factory, composite `(factory_id, executed_at DESC)` pour récupérer la dernière passe, partial `WHERE status = 'RUNNING'`

- **Nouvelle table `mrp_recommendations`** : recommandations & alertes MRP (≡ SAP MDTB)
  - Colonnes : `organization_id`, `factory_id`, `mrp_run_id` (FK cascade), `article_id`, `action_type`, `suggested_quantity`, `suggested_order_date`, `required_date`, `status`, `linked_purchase_requisition_id`, `linked_production_order_id`, `created_at`, `updated_at`
  - `action_type CHECK ('BUY', 'PRODUCE', 'EXPEDITE')` — BUY→DA, PRODUCE→OF, EXPEDITE→avancer BC existant
  - `status CHECK ('NEW', 'CONVERTED', 'IGNORED')` — `DEFAULT 'NEW'` ; CONVERTED/IGNORED sont **immuables** (RLS UPDATE bloqué dès que status ≠ 'NEW')
  - `CONSTRAINT mrp_rec_dates_coherence CHECK (required_date >= suggested_order_date)`
  - Traçabilité bidirectionnelle : `linked_purchase_requisition_id` (BUY) + `linked_production_order_id` (PRODUCE) — `ON DELETE SET NULL`
  - Trigger `updated_at` (passage NEW → CONVERTED/IGNORED)
  - 9 index : org, factory, run, article, partial `WHERE status='NEW'`, composite dashboard `(factory_id, status, required_date ASC)`, action_type, preq, prod_order

### Câblage App — MRP Types, Actions & Tab ④

#### `src/types/erp.ts` — section MRP (migration 012)
- `MrpRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'`
- Interface `MrpRun` : id, organizationId, factoryId, executedAt, executedBySystem, status
- `MrpActionType = 'BUY' | 'PRODUCE' | 'EXPEDITE'`
- `MrpRecommendationStatus = 'NEW' | 'CONVERTED' | 'IGNORED'`
- Interface `MrpRecommendation` (tous les champs DB) + `MrpRecommendationRow` (étendue avec `articleLabel`, `articleSku`, `articleUnit`)
- Constantes label/couleur : `MRP_ACTION_LABELS/COLORS`, `MRP_REC_STATUS_LABELS/COLORS`

#### `lib/actions/mrp.ts` (nouveau)
- `getLatestMrpRun()` — dernière passe SUCCESS (`ORDER BY executed_at DESC LIMIT 1`)
- `getMrpRecommendations(filter)` — toutes les recs avec JOIN `articles!article_id(designation, code, unite_stock)` ; filtré par statut ou ALL
- `getRecommendationsByRun(runId)` — recs d'une passe spécifique
- `convertRecommendation(id, opts?)` — `UPDATE status='CONVERTED' WHERE status='NEW'` + FK optionnelles `linked_purchase_requisition_id` / `linked_production_order_id`
- `ignoreRecommendation(id)` — `UPDATE status='IGNORED' WHERE status='NEW'`
- `createMrpRun(factoryId)` — INSERT `status='RUNNING'`, `executed_by_system=false` pour passes manuelles

#### `mrp/page.tsx` — Tab ④ Recommandations (données réelles)
- Nouveau tab `{ key: 'recommandations', label: '④ Recommandations' }` avec badge compteur orange si recs NEW > 0
- États : `recFilter`, `recs`, `latestRun`, `recLoading`, `actingId`
- `loadRecs()` : `Promise.all([getMrpRecommendations(filter), getLatestMrpRun()])` — chargement parallèle
- `useEffect` déclenché au changement de tab ou de filtre
- **UI** : barre info (dernière passe + date + type) + bouton Actualiser · 3 cartes stat (NEW/CONVERTED/IGNORED) · filtres boutons pill · tableau 7 colonnes (article, action badge, qté, date commande, date besoin + countdown j, statut, actions)
- Boutons **Valider** / **Ignorer** par ligne — disabled si `actingId === rec.id` (anti-double-clic) ; spinner Loader2 pendant l'action
- Urgence visuelle : fond rouge atténué + countdown "Xj" rouge si date besoin ≤ 7 jours et status NEW
- Mise à jour **optimiste** : `setRecs(prev => prev.map(r => r.id === rec.id ? updated : r))` — pas de re-fetch complet
- Note de bas de tableau : "Valider crée une DA (BUY) ou un OF (PRODUCE) · les décisions sont immuables (audit trail)"

---

## [2026-05-27] — Session 8

### BOM & Gamme — Câblage Supabase complet

#### `lib/actions/bom.ts` (nouveau)
- `getBomByArticleId(articleId)` — lecture BOM active avec JOIN `articles!component_id(code)` pour résoudre les codes composants
- `upsertBom(articleId, header, ingredients, existingBomId?)` — insert ou update avec désactivation de la BOM précédente (contrainte `EXCLUDE` d'unicité) et remplacement atomique des lignes (delete + re-insert)
- `getGammeByArticleId(articleId)` — lecture gamme active avec JOIN `work_centers(name, code, rate_per_hour)` → dénormalise les infos poste dans chaque étape
- `upsertGamme(articleId, header, etapes, existingGammeId?)` — même pattern : désactivation + insert ; persiste `work_center_id` sur chaque `routing_step`
- Mappers `toBomHeader`, `toBomIngredient`, `toRoutingHeader`, `toRoutingStep` avec cast `as unknown as Record<string, unknown>` pour les retours Supabase jointurés
- Page article `[id]` : `useEffect` charge BOM et gamme depuis Supabase au montage ; fin des mocks

#### `GammeEtape` enrichie (`articles/_components/gamme.ts`)
- Nouveaux champs dénormalisés : `workCenterId`, `workCenterName`, `workCenterCode`, `workCenterRatePerHour`
- Suppression du tableau `MOCK_WORK_CENTERS` (devenu dead code)

### Postes de charge (Work Centers)

#### `lib/actions/work-centers.ts` (nouveau)
- `getWorkCenters()` — postes actifs uniquement (pour dropdowns)
- `getAllWorkCenters()` — actifs + inactifs (page de gestion)
- `createWorkCenter(input)` — insert avec résolution `factory_id` via helper `resolveFactoryId()` (tente `profiles.factory_id`, repli sur premier factory de l'org)
- `updateWorkCenter(id, input)` — patch partiel incluant `isActive` pour le toggle

#### Interface `WorkCenter` (`src/types/erp.ts`)
- Source de vérité unique : `id`, `name`, `code`, `ratePerHour`, `currency`, `dailyCapacityHours`, `efficiencyPercentage`, `isActive`, `createdAt`

#### Page `/production/postes-de-charge`
- 3 cartes résumé : postes actifs · capacité effective totale (h/j) · TRS moyen
- Tableau : code badge monospace, nom, taux (XOF/h), capacité (h/j), barre TRS colorée (vert ≥90% / orange ≥70% / rouge), capacité effective + coût journalier estimé
- Actions par ligne : Pencil (modifier) + Power (activer/désactiver) avec état `togglingId`
- Sidebar : entrée "Postes de charge" sous Production (icône `Cog`)

#### `WorkCenterModal` (`_components/work-center-modal.tsx`)
- Champs : Nom*, Code court (uppercase, optionnel), Taux horaire (XOF/h), Capacité journalière, Efficacité TRS %
- Récapitulatif temps réel : capacité effective = h/j × TRS%, coût journalier = capEff × taux, coût horaire facturé
- Validation : nom requis, taux ≥ 0, capacité > 0, TRS entre 1 et 100

#### Gamme — intégration postes de charge dans l'UI
- `GammeEditModal` : dropdown `<select>` des postes (depuis DB) remplace le champ texte `equipement`
- Helper `setWorkCenter()` : met à jour les 4 champs dénormalisés (`workCenterId`, `workCenterName`, `workCenterCode`, `workCenterRatePerHour`) en une seule opération
- Footer modal : coût gamme total en temps réel `Σ (duree + setupTimeMinutes) / 60 × ratePerHour`
- Lien vers `/production/postes-de-charge` si aucun poste n'existe encore
- Page article `[id]` — onglet Gamme : colonnes "Poste de charge" (badge `[CODE] Nom`), "Rég. (min)" (setup time) et "Coût ≈" par étape ; ligne de totaux (durée + coût gamme)

### Analyse de marge — Données réelles Supabase

#### `lib/actions/marge.ts` (nouveau)
- `getMarginAnalysis()` : calcule le coût standard pour tous les articles `PF` — **5 requêtes** optimisées (pas de N+1) :
  1. Articles PF (`id`, `code`, `designation`, `pmp`, `prix_vente`)
  2. BOM headers actifs pour ces articles
  3. BOM items + `articles!component_id(code, designation, pmp)` pour les PMPs composants
  4. Routing headers actifs
  5. Routing steps + `work_centers(name, code, rate_per_hour)` pour les taux
- Formule coût standard : ① `Σ qté/u × articles.pmp` + ② `Σ (durée_lot_min / 60 / batchSize) × rate_per_hour` + ③ FG 8% × directs + ④ forfait énergie 50 XOF
- Retourne `MarginLine[]` avec décomposition complète + détails BOM + gamme pour drill-down
- Types exportés : `MarginLine`, `MarginLigneBOM`, `MarginLigneGamme`

#### `analyse-marge/page.tsx` — refactorisé
- **Supprimé** : `TAUX_PAR_EQUIPEMENT`, `PMP`, `PRIX_VENTE_HT`, `PF_SKUS`, `TAUX_DEFAUT`, `calcCoutStandard()`, imports mock `getBOMByArticleCode` / `getGammeByArticleCode`
- **Ajouté** : `useState<MarginLine[]>` + `useEffect(() => getMarginAnalysis().then(setStandards))`
- Spinner de chargement + état vide si aucun article PF en base
- Mock OFs (onglets 2 & 3) : filtrés sur les SKUs présents en DB ; bandeau "données de démonstration" — seront remplacés par de vrais OFs dès l'activation du module
- Drill-down gamme : affiche poste `[CODE] Nom`, durée en min, taux en **XOF/h** (cohérent avec la DB)
- Alerte visuelle si `pmp = 0` sur un composant BOM

### Fix — Turbopack / Next.js 16
- **Règle établie** : toutes les interfaces TypeScript importées depuis des fichiers `'use server'` utilisent `import type` (ex. `import type { WorkCenter } from '@/types/erp'`)
- Ne jamais `export type` depuis un fichier `'use server'` vers un composant client — les types doivent être importés directement depuis `@/types/erp` ou le fichier de types
- Cause : Turbopack cherche une valeur runtime pour `import { X }` ; une `interface` TypeScript étant effacée à la compilation, la résolution échoue avec "Export X doesn't exist in target module"

---

## [2026-05-28] — Session 11 — Câblage Supabase (Appro / Réception / Stocks)

### Migration 014 — `014_add_receipt_number.sql`
- **Nouvelle colonne** `receipt_number TEXT` sur `goods_receipts` — numérotation interne `REC-YYYY-NNNN` indépendante du bon fournisseur

### `lib/actions/approvisionnement.ts` — refactorisé
- `getPurchaseOrders()` — retourne `BCFlat[]` avec JOIN vendor + lines ; tri `created_at DESC`
- `getPurchaseRequisitions()` — DA issues du moteur MRP
- `getArticleStrategies()` — paramètres MRP par article
- `createPurchaseOrder(input)` — upsert fournisseur (via `vendors` ou texte libre) ; numérotation séquentielle `BC-YYYY-NNN` / `BA-YYYY-NNN` ; insert header + lignes en transaction

### `lib/actions/reception.ts` (nouveau)
- `getGoodsReceipts()` — toutes les réceptions avec JOIN `vendors` + `goods_receipt_items × articles`
- `createGoodsReceipt(input)` — numérotation `REC-YYYY-NNNN` ; rapprochement automatique lignes BC par `article_label` ; calcul DLC = `today + shelf_life_days` depuis le BC correspondant

### `lib/actions/stocks.ts` — refactorisé
- `getLotStocks()` — construit depuis `goods_receipt_items × articles` (plus de mock)
- `getMouvementsByArticle()` + `getLotsByArticle()` — restaurés sur `stock_movements` + `goods_receipt_items` réels

### Pages mises à jour
- `approvisionnement/page.tsx` + `reception/page.tsx` + `stocks/page.tsx` : `useEffect` → server actions ; états `loading` ; handlers `handleSave` câblés

---

## [2026-05-29] — Session 12 — Phase 2 : Ventes & Logistique + Dashboard Direction + Généalogie

### Phase 2 — Modules Ventes, ADV, Logistique (structure, désactivés en nav)

#### `ventes/page.tsx` (nouveau)
- 4 cartes stat : CA confirmé · Commandes en cours · En attente · Taux OTIF
- Tableau resizable `useResizableColumns('bluwa:cols:ventes')` : N° commande · Client · Articles · Qté · Prix unitaire · Montant HT · Livraison prévue · Statut · Action
- `flattenCommandes()` — vue plate Header × Item pour l'affichage tableau
- Avancement statut contextuel via `STATUT_COMMANDE_NEXT` + bouton `ChevronRight` au survol
- Server actions prévues : `getSalesOrders`, `createSalesOrder`, `updateSalesOrderStatus`

#### `adv/page.tsx` (nouveau)
- Deux onglets : **Factures** + **Commandes à facturer**
- `createInvoiceFromOrder` sur bouton "Créer facture" · `updateInvoiceStatus` pour avancement
- Server actions prévues : `getCustomerInvoices`, `getSalesOrders`

#### `logistique/page.tsx` (nouveau)
- `CreateBLModal` inline : sélecteur commande client, date livraison, transporteur, référence suivi, adresse
- Server actions prévues : `createDeliveryNote`, `updateDeliveryStatus`

#### Sidebar
- Nouveau groupe **Ventes & Logistique** (`t('ventes')`) avec 3 items `disabled: true` :
  - Commandes clients (`/ventes`, `ShoppingBag`)
  - Facturation ADV (`/adv`, `Receipt`)
  - Bons de livraison (`/logistique`, `PackageCheck`)
- i18n `fr.json` : `ventes`, `commandesClients`, `adv`, `bonsLivraison`
- i18n `en.json` : idem en anglais

---

### Réception — Impression étiquettes traçabilité par contenant

#### `reception/_components/label-print-modal.tsx` (nouveau)
- Props : `{ open, row: ReceptionFlat | null, onClose }`
- Types de contenant : Carton · Palette · Sac · Caisse · Bidon · Vrac
- Qté/contenant : auto-calculée `Math.ceil(total ÷ nbContenants)`, éditable
- `buildPrintHtml()` : génère N étiquettes 100 × 72 mm en HTML avec barcodes CODE128 (JsBarcode CDN)
  - Contenu étiquette : code lot (bold), désignation article, date réception, DLC (rouge), qté/contenant (rouge), footer N° réception + fournisseur + total
  - `window.open()` → `window.print()` déclenché après 400 ms (evite flash)
- Page `reception/page.tsx` : bouton Printer existant → `setPrintRow(r)` → modal

---

### Dashboard — Refonte direction (KPIs managériaux)

#### KPIs remplacés
- Abandonne : "Lots actifs", "Stock total", "Rendement", "Non-conformités" (trop opérationnel)
- Remplace par 6 métriques gérant : **CA du mois** · **Marge brute** · **EBITDA** · **TRS** · **OTIF** · **Valeur stock**
- Composant `KpiDir` : accent coloré `h-1` en haut, label small-caps, valeur large, sous-titre

#### Graphiques Recharts ajoutés
- `BarChart` : CA vs Coût de production (6 derniers mois) — `ResponsiveContainer`
- `PieChart` donut (`innerRadius={55}`) : mix ventes par produit — 4 segments colorés + légende
- Dépendance `recharts: ^3.8.1` ajoutée à `package.json`

#### Blocs analytiques
- **Analyse de marge** (insight compact 3 métriques) : Écart moyen · Produit déviant · Tendance + lien "Détail →"
- **Alertes prioritaires** (4 niveaux code couleur rouge/jaune/bleu/vert) : emoji + titre + détail + lien `Link`
- **P&L cascade** : `grid-cols-5` horizontal — CA → Coût production → **Marge brute** (émeraude) → Charges fixes → **EBITDA** (bleu)

#### Suppression sections opérationnelles
- Retirés : Production active · DA · Contrôle qualité · Non-conformités · Alertes DLC · Commandes
- Règle appliquée : *"le tableau de bord alerte et redirige, la page explique"*
- Nettoyage : tous les imports mock operationnels, `useMemo`, `Section`, `ProgressBar`, `formatDlcStatus` supprimés (−436 lignes)

---

### Généalogie — Sections CCP et Destinations AVAL

#### `qualite/_components/types.ts`
- Nouveau type `ControleCCP` : `{ nom, valeur, spec, conforme: boolean }`
- Nouveau type `DestinationAval` : `{ destination, dateLivraison: string | null, quantite, unite }`
- `GenealogiePF` étendu : `ccps?: ControleCCP[]` · `destinations?: DestinationAval[]`
- Mock data LOT-PF-0041 : Pasteurisation ✓ · pH 4.7 ⚠ hors spec · Brix ✓ ; 3 destinations (Super Marché Hayat, Boulangerie Étoile, Stock dispo)
- Mock data LOT-PF-0042 : 3 CCP tous conformes ; 3 destinations (Abidjan, Hôtel Teranga, Stock dispo)

#### `qualite/genealogie/page.tsx`
- `PFResult` : section **Contrôles CCP** — 3 cartes côte à côte, accent gauche vert/rouge, badge "✓ Conforme" / "⚠ Hors spec"
- `PFResult` : section **AVAL — Destinations & Distribution** — table (destination · date livraison · quantité)
- Export TXT enrichi avec les deux nouvelles sections
- Imports ajoutés : `FlaskConical`, `TruckIcon`, `ControleCCP`, `DestinationAval`

---

## À venir

### Schéma BDD — Migrations à écrire
- [ ] **`003_commandes.sql`** — commandes fournisseurs + commandes clients (avec `organization_id` + `factory_id`, logique territoire)
- [ ] **`004_stock.sql`** — stocks par lot, mouvements, traçabilité FEFO
- [ ] **`005_production.sql`** — ordres de fabrication, nomenclatures, gammes, postes de charge

### Refactoring — Alignement avec le nouveau schéma
- [ ] Toutes les server actions existantes (approvisionnement, réception, stocks, MRP…) reposent sur l'ancien schéma — à réécrire sur les nouvelles tables
- [ ] `BCHeader.fournisseur` est un string texte — migrer vers `fournisseur_id UUID` (FK vers `fournisseurs`)
- [ ] `getArticlesLite()` et toutes les actions articles : à recâbler sur la nouvelle table `articles` (002)
- [ ] Pages clients et fournisseurs : à recâbler sur `clients` + `client_factory_links` et `fournisseurs` + `fournisseur_factory_links`

### Dette technique
- [ ] Pas de système de notifications (toast) — les erreurs d'actions sont silencieuses
- [ ] Pas de pagination sur les requêtes liste
- [ ] Bouton de déconnexion absent du sidebar
- [ ] Aucun test (unitaire ou E2E)
- [ ] Dashboard KPIs : brancher sur vraies données Supabase (CA, marge, OTIF, valeur stock)
