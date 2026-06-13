-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 022 — Restriction INSERT factories à l'application Bluwa Merchant
--
-- La création de nouveaux sites de production est réservée à l'équipe Bluwa
-- (application interne Merchant / back-office). Les utilisateurs ERP standards
-- (owner, admin, ...) ne peuvent plus insérer de lignes dans factories.
--
-- Avant : factories_insert_admin autorisait tout owner/admin à créer un site.
-- Après : seules les sessions authentifiées avec un email @bluwa.io le peuvent.
-- ══════════════════════════════════════════════════════════════════════════════

-- Supprime l'ancienne politique permissive
DROP POLICY IF EXISTS factories_insert_admin ON public.factories;

-- Nouvelle politique : INSERT réservé aux comptes @bluwa.io (Merchant / ops)
CREATE POLICY factories_insert_bluwa_only ON public.factories
    FOR INSERT
    WITH CHECK (auth.email() LIKE '%@bluwa.io');
