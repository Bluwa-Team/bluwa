-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 022 — Site de production par défaut pour chaque organisation
--
-- Insère un site "Site Principal" pour chaque organisation qui n'en possède
-- pas encore. Idempotente : la sous-requête NOT EXISTS garantit qu'on ne
-- double pas les orgs qui ont déjà au moins un site.
--
-- À appliquer APRÈS la migration 021 (colonnes oh_rate + energie_unit_cost).
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.factories (
    organization_id,
    name,
    code,
    country,
    timezone,
    currency,
    site_type,
    is_owned,
    is_active,
    oh_rate,
    energie_unit_cost
)
SELECT
    o.id,
    'Site Principal',
    'SITE1',
    'Sénégal',
    'Africa/Dakar',
    'XOF',
    'usine',
    true,
    true,
    0.08,
    50
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1
    FROM   public.factories f
    WHERE  f.organization_id = o.id
);
