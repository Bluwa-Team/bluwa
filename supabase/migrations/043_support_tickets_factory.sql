-- ============================================================
-- Migration 043 — support_tickets : org_id → factory_id
-- La table est vide, migration simple et idempotente
-- ============================================================

ALTER TABLE support_tickets
  DROP COLUMN IF EXISTS org_id,
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE CASCADE;

-- Rendre factory_id obligatoire (après ADD pour éviter l'erreur NOT NULL sur table vide)
ALTER TABLE support_tickets
  ALTER COLUMN factory_id SET NOT NULL;

DROP INDEX IF EXISTS idx_tickets_org;
CREATE INDEX IF NOT EXISTS idx_tickets_factory ON support_tickets(factory_id);

-- RLS : recréer la policy admin avec le bon pattern
DROP POLICY IF EXISTS "tickets_admin" ON support_tickets;
CREATE POLICY "tickets_admin" ON support_tickets FOR ALL
  USING (auth.email() LIKE '%@bluwa.io');
