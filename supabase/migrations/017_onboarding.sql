-- ============================================================
-- Migration 017 — Onboarding pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_pipeline (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES organizations(id),   -- null si prospect pas encore org
  org_name         TEXT NOT NULL,
  country          TEXT,
  stage            TEXT NOT NULL DEFAULT 'prospect'
                     CHECK (stage IN ('prospect','demo','trial','configuration','formation','golive')),
  plan_target      TEXT,
  assigned_to      TEXT,
  notes            TEXT,
  blocked          BOOLEAN NOT NULL DEFAULT false,
  blocked_reason   TEXT,
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES onboarding_pipeline(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS onboarding_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES onboarding_pipeline(id) ON DELETE CASCADE,
  author      TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_onboarding_pipeline') THEN
    CREATE TRIGGER set_updated_at_onboarding_pipeline
      BEFORE UPDATE ON onboarding_pipeline
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS onboarding_pipeline_org_id_idx ON onboarding_pipeline(org_id);
CREATE INDEX IF NOT EXISTS onboarding_checklist_pipeline_id_idx ON onboarding_checklist(pipeline_id);
CREATE INDEX IF NOT EXISTS onboarding_comments_pipeline_id_idx ON onboarding_comments(pipeline_id);
