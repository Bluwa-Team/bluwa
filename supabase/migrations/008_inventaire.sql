-- ── 008_inventaire.sql ────────────────────────────────────────────────────────
-- Crée les tables inventory_documents + inventory_document_items.
-- Ces tables étaient référencées par le frontend mais absentes des migrations.
--
-- Choix clés :
--   • difference_quantity = GENERATED ALWAYS AS (counted - book) STORED
--     → jamais écrite par l'application, toujours calculée par la DB
--   • organization_id sur les items → RLS directe, cohérente avec goods_receipt_items
--   • UNIQUE (organization_id, document_number) → pas de doublon de numéro par org
--   • ON DELETE CASCADE sur inventory_document_id → suppression propre des lignes
-- ─────────────────────────────────────────────────────────────────────────────

-- ── INVENTORY_DOCUMENTS ───────────────────────────────────────────────────────

CREATE TABLE public.inventory_documents (
    id               UUID        DEFAULT gen_random_uuid() NOT NULL,
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id),
    factory_id       UUID        NOT NULL REFERENCES public.factories(id),
    document_number  TEXT        NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'PROPOSED'
                       CHECK (status IN ('PROPOSED', 'COUNTED', 'POSTED')),
    created_by       UUID        REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    posted_at        TIMESTAMPTZ,
    CONSTRAINT inventory_documents_pkey    PRIMARY KEY (id),
    CONSTRAINT inventory_documents_doc_num UNIQUE (organization_id, document_number)
);

COMMENT ON TABLE  public.inventory_documents IS
  'Document d''inventaire physique (≡ MI01 SAP). Cycle : PROPOSED → COUNTED → POSTED.';
COMMENT ON COLUMN public.inventory_documents.status IS
  'PROPOSED = en attente de comptage | COUNTED = toutes lignes saisies | POSTED = écarts appliqués en stock';
COMMENT ON COLUMN public.inventory_documents.posted_at IS
  'Horodatage de la validation définitive (COUNTED → POSTED)';

-- ── INVENTORY_DOCUMENT_ITEMS ──────────────────────────────────────────────────

CREATE TABLE public.inventory_document_items (
    id                     UUID     DEFAULT gen_random_uuid() NOT NULL,
    inventory_document_id  UUID     NOT NULL
                             REFERENCES public.inventory_documents(id) ON DELETE CASCADE,
    organization_id        UUID     NOT NULL REFERENCES public.organizations(id),
    article_id             UUID     NOT NULL REFERENCES public.articles(id),
    batch_number           TEXT,
    book_quantity          NUMERIC  NOT NULL DEFAULT 0
                             CHECK (book_quantity >= 0),
    counted_quantity       NUMERIC  CHECK (counted_quantity >= 0),
    -- Jamais écrite par l'application — calculée par la DB
    difference_quantity    NUMERIC  GENERATED ALWAYS AS (counted_quantity - book_quantity) STORED,
    created_at             TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT inventory_document_items_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE  public.inventory_document_items IS
  'Lignes de comptage (≡ MI04 SAP). difference_quantity est GENERATED par la DB.';
COMMENT ON COLUMN public.inventory_document_items.book_quantity IS
  'Snapshot du stock système au moment de la création du document.';
COMMENT ON COLUMN public.inventory_document_items.counted_quantity IS
  'NULL = ligne non encore saisie par le compteur.';
COMMENT ON COLUMN public.inventory_document_items.difference_quantity IS
  'counted_quantity - book_quantity. NULL si counted_quantity non renseigné.';

-- ── INDEX ─────────────────────────────────────────────────────────────────────

CREATE INDEX idx_inventory_docs_org     ON public.inventory_documents(organization_id, created_at DESC);
CREATE INDEX idx_inventory_items_doc    ON public.inventory_document_items(inventory_document_id);
CREATE INDEX idx_inventory_items_org    ON public.inventory_document_items(organization_id);
CREATE INDEX idx_inventory_items_article ON public.inventory_document_items(article_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE public.inventory_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_document_items ENABLE ROW LEVEL SECURITY;

-- Documents : accès complet sur la propre organisation
CREATE POLICY inventory_docs_select ON public.inventory_documents
    FOR SELECT USING (organization_id = public.fn_user_org());

CREATE POLICY inventory_docs_insert ON public.inventory_documents
    FOR INSERT WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY inventory_docs_update ON public.inventory_documents
    FOR UPDATE
    USING     (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());

-- Items : organization_id direct (cohérent avec goods_receipt_items)
CREATE POLICY inventory_items_select ON public.inventory_document_items
    FOR SELECT USING (organization_id = public.fn_user_org());

CREATE POLICY inventory_items_insert ON public.inventory_document_items
    FOR INSERT WITH CHECK (organization_id = public.fn_user_org());

CREATE POLICY inventory_items_update ON public.inventory_document_items
    FOR UPDATE
    USING     (organization_id = public.fn_user_org())
    WITH CHECK (organization_id = public.fn_user_org());
