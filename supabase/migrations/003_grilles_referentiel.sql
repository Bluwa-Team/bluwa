-- Tables manquantes après nettoyage BDD mai 2026
-- grilles_tarifaires : prix négociés par client/article
-- referentiel_values : familles, unités, catégories enrichies par l'utilisateur

-- ── grilles_tarifaires ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grilles_tarifaires (
  id          UUID        DEFAULT gen_random_uuid() NOT NULL,
  client_id   UUID        NOT NULL,
  article_code TEXT        NOT NULL,
  designation TEXT,
  prix_negocie NUMERIC    NOT NULL,
  devise      TEXT        DEFAULT 'XOF' NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT grilles_tarifaires_pkey PRIMARY KEY (id),
  CONSTRAINT grilles_tarifaires_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.grilles_tarifaires IS 'Prix de vente négociés par client et par article (PF/PSF)';

CREATE INDEX IF NOT EXISTS idx_grilles_client ON public.grilles_tarifaires USING btree (client_id);

ALTER TABLE public.grilles_tarifaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY grilles_select ON public.grilles_tarifaires
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.clients
      WHERE clients.organization_id = public.fn_user_org()
    )
  );

CREATE POLICY grilles_write ON public.grilles_tarifaires
  USING (
    client_id IN (
      SELECT id FROM public.clients
      WHERE clients.organization_id = public.fn_user_org()
    )
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    )::text = ANY (ARRAY['owner', 'admin', 'manager'])
  );

-- ── referentiel_values ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referentiel_values (
  id              UUID        DEFAULT gen_random_uuid() NOT NULL,
  organization_id UUID        NOT NULL,
  kind            TEXT        NOT NULL,
  value           TEXT        NOT NULL,
  parent          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT referentiel_values_pkey PRIMARY KEY (id),
  CONSTRAINT referentiel_values_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT referentiel_values_kind_check
    CHECK (kind = ANY (ARRAY[
      'article_famille', 'article_sous_famille', 'article_categorie',
      'unite_stock', 'unite_mesure'
    ]))
);

COMMENT ON TABLE public.referentiel_values IS 'Valeurs de référentiel enrichies par l''utilisateur (familles, unités, catégories)';

CREATE INDEX IF NOT EXISTS idx_referentiel_org_kind
  ON public.referentiel_values USING btree (organization_id, kind);

ALTER TABLE public.referentiel_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY referentiel_select ON public.referentiel_values
  FOR SELECT USING (organization_id = public.fn_user_org());

CREATE POLICY referentiel_write ON public.referentiel_values
  USING (
    organization_id = public.fn_user_org()
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    )::text = ANY (ARRAY['owner', 'admin', 'manager'])
  );
