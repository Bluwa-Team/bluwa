-- =====================================================================================
-- Migration 013 — Production Outputs (Fin de production & Entrée stock PF)
-- =====================================================================================
-- Déclaration de fin de fabrication : quantités bonnes, rebuts, lot PF et DLC.
-- Source de vérité pour les entrées stock PF (≡ SAP CO11N / MB31 MOUVEMENT 101).
--
-- Cycle de vie (status) :
--   DRAFT     → saisie opérateur en cours (modifiable, supprimable)
--   CONFIRMED → validé chef d'équipe (verrouillé, en attente comptabilisation)
--   POSTED    → comptabilisé, lot PF créé en stock (immuable — audit trail)
--
-- Règles d'immuabilité :
--   UPDATE : bloqué si status = 'POSTED'  (RLS)
--   DELETE : bloqué sauf si status = 'DRAFT' (RLS)
--
-- Cohérence dates :
--   - Si CONFIRMED ou POSTED : confirmed_by + confirmed_at obligatoires (CHECK)
--   - Si POSTED              : posted_at obligatoire (CHECK)
--
-- Traçabilité ascendante / descendante :
--   production_order_id → OF d'origine
--   product_batch_number → lot PF identifié jusqu'à la distribution (FEFO)
--   article_id → produit fini ou semi-fini (PSF pour sous-traitance partielle)
-- =====================================================================================

-- ── Table principale ─────────────────────────────────────────────────────────────────

CREATE TABLE production_outputs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    factory_id      UUID NOT NULL REFERENCES factories(id)          RESTRICT,
    production_order_id UUID NOT NULL REFERENCES production_orders(id) RESTRICT,
    article_id      UUID NOT NULL REFERENCES articles(id)           RESTRICT,

    -- ── Identification ──────────────────────────────────────────────────────────────
    output_number   VARCHAR(50) NOT NULL,
    -- ex: DP-TOG-2026-0094  (Déclaration Production · site · année · séquence)

    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'CONFIRMED', 'POSTED')),
    -- DRAFT     : saisie opérateur (modifiable)
    -- CONFIRMED : validé chef d'équipe (verrouillé, en attente POSTED)
    -- POSTED    : comptabilisé et lot PF créé en stock (immuable)

    -- ── Quantités ───────────────────────────────────────────────────────────────────
    quantity_produced DECIMAL(15, 4) NOT NULL
        CHECK (quantity_produced > 0),
    -- Quantité bonne réellement produite (≠ qty planifiée dans l'OF)

    quantity_scrap    DECIMAL(15, 4) NOT NULL DEFAULT 0.0000
        CHECK (quantity_scrap >= 0),
    -- Rebuts / déchets jetés en fin de ligne (Lean Six Sigma — taux rebut = scrap / (produced + scrap))

    -- ── Lot de produit fini (clé de voûte traçabilité → ventes → distribution) ─────
    product_batch_number VARCHAR(100) NOT NULL,
    -- ex: LOT-FIN-20260528-01  — identifiant unique du lot PF jusqu'au consommateur

    expiry_date DATE NOT NULL,
    -- DLC du lot PF (calculée par l'app : declared_at + article.duree_vie)

    -- ── Traçabilité opérateur ───────────────────────────────────────────────────────
    declared_by UUID NOT NULL REFERENCES auth.users(id) RESTRICT,
    declared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    -- Opérateur ou chef d'équipe ayant déclaré la fin de production

    confirmed_by UUID REFERENCES auth.users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    -- Chef d'équipe ou responsable production ayant validé la déclaration

    posted_at    TIMESTAMP WITH TIME ZONE,
    -- Horodatage de la comptabilisation (entrée en stock effective)

    -- ── Notes libres ────────────────────────────────────────────────────────────────
    notes TEXT,
    -- Observations de fin de ligne, incidents, écarts vs OF planifié

    -- ── Audit ───────────────────────────────────────────────────────────────────────
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),

    -- ── Contraintes d'intégrité ─────────────────────────────────────────────────────
    CONSTRAINT unique_output_number_per_tenant
        UNIQUE (organization_id, output_number),

    CONSTRAINT unique_product_batch_per_tenant
        UNIQUE (organization_id, product_batch_number),

    -- CONFIRMED et POSTED requièrent une validation chef d'équipe
    CONSTRAINT production_outputs_confirmed_coherence CHECK (
        status = 'DRAFT'
        OR (status IN ('CONFIRMED', 'POSTED') AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)
    ),

    -- POSTED requiert un horodatage de comptabilisation
    CONSTRAINT production_outputs_posted_coherence CHECK (
        status != 'POSTED'
        OR (status = 'POSTED' AND posted_at IS NOT NULL)
    ),

    -- La DLC doit être postérieure à la date de déclaration
    CONSTRAINT production_outputs_expiry_coherence CHECK (
        expiry_date > declared_at::DATE
    )
);

COMMENT ON TABLE production_outputs IS
    'Déclarations de fin de production : quantités bonnes + rebuts, lot PF, DLC. '
    'Alimente la traçabilité FEFO et les entrées en stock produit fini (≡ SAP CO11N / MB31).';

COMMENT ON COLUMN production_outputs.quantity_scrap IS
    'Rebuts et déchets jetés en fin de ligne. '
    'Taux de rebut = scrap / (produced + scrap). Ne pas confondre avec le rebut planifié BOM (scrap_factor_percentage).';

COMMENT ON COLUMN production_outputs.product_batch_number IS
    'Numéro de lot du produit fini — clé de traçabilité de la production à la distribution. '
    'Format recommandé : LOT-FIN-YYYYMMDD-NN. UNIQUE par tenant (contrainte DB).';

COMMENT ON COLUMN production_outputs.expiry_date IS
    'DLC du lot PF. Calculée par l''application : declared_at + article.duree_vie. '
    'Utilisée pour les requêtes FEFO lors des expéditions.';

-- ── Trigger updated_at ───────────────────────────────────────────────────────────────

CREATE TRIGGER trg_production_outputs_updated_at
    BEFORE UPDATE ON production_outputs
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────────────

ALTER TABLE production_outputs ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres de l'organisation
CREATE POLICY "production_outputs_select"
    ON production_outputs FOR SELECT
    USING (organization_id = fn_current_org_id());

-- Insertion : membres de l'organisation (déclaration opérateur)
CREATE POLICY "production_outputs_insert"
    ON production_outputs FOR INSERT
    WITH CHECK (organization_id = fn_current_org_id());

-- Mise à jour : autorisée seulement si la déclaration n'est pas encore comptabilisée
-- (DRAFT → CONFIRMED, CONFIRMED → POSTED — transitions applicatives)
CREATE POLICY "production_outputs_update"
    ON production_outputs FOR UPDATE
    USING (
        organization_id = fn_current_org_id()
        AND status != 'POSTED'   -- POSTED est immuable côté DB (double garde avec l'app)
    );

-- Suppression : uniquement les brouillons (avant toute validation)
CREATE POLICY "production_outputs_delete"
    ON production_outputs FOR DELETE
    USING (
        organization_id = fn_current_org_id()
        AND status = 'DRAFT'
    );

-- ── Indexes ──────────────────────────────────────────────────────────────────────────

-- Isolation multi-tenant (préfixe de toutes les requêtes filtrées)
CREATE INDEX idx_production_outputs_org
    ON production_outputs (organization_id);

-- Filtrage par site de production
CREATE INDEX idx_production_outputs_factory
    ON production_outputs (organization_id, factory_id);

-- Historique des déclarations par OF (lien amont)
CREATE INDEX idx_production_outputs_of
    ON production_outputs (organization_id, production_order_id);

-- Historique de production par article / PF
CREATE INDEX idx_production_outputs_article
    ON production_outputs (organization_id, article_id);

-- Dashboard chronologique (liste principale triée par date)
CREATE INDEX idx_production_outputs_declared_at
    ON production_outputs (organization_id, declared_at DESC);

-- Lookup lot PF et traçabilité (distribution, ventes, rappels)
CREATE INDEX idx_production_outputs_batch
    ON production_outputs (organization_id, product_batch_number);

-- FEFO : requêtes par DLC croissante (expédition, alertes péremption)
CREATE INDEX idx_production_outputs_expiry
    ON production_outputs (organization_id, expiry_date ASC);

-- Déclarations en attente de traitement (DRAFT + CONFIRMED) — filtre partiel
CREATE INDEX idx_production_outputs_pending
    ON production_outputs (organization_id, factory_id, declared_at DESC)
    WHERE status IN ('DRAFT', 'CONFIRMED');

-- Audit opérateur : toutes les déclarations d'un utilisateur
CREATE INDEX idx_production_outputs_declared_by
    ON production_outputs (declared_by);
