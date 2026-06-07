-- ============================================================
-- Migration 045 — Onboarding pipeline : 5 phases Excel
-- Remplace les 6 stages (prospect/demo/trial/config/formation/golive)
-- par les 5 phases opérationnelles du Kanban Roadmap Bluwa
-- ============================================================

-- ── 1. Supprimer les anciens seed data (migration 041) ─────────────────────
DELETE FROM onboarding_checklist
  WHERE pipeline_id IN (
    SELECT id FROM onboarding_pipeline
    WHERE org_name IN ('Chom Factory', 'Africube')
  );

DELETE FROM onboarding_comments
  WHERE pipeline_id IN (
    SELECT id FROM onboarding_pipeline
    WHERE org_name IN ('Chom Factory', 'Africube')
  );

DELETE FROM onboarding_pipeline
  WHERE org_name IN ('Chom Factory', 'Africube');

-- ── 2. Remplacer le CHECK constraint sur stage ─────────────────────────────
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'onboarding_pipeline'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%stage%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE onboarding_pipeline DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE onboarding_pipeline
  ADD CONSTRAINT onboarding_pipeline_stage_check
  CHECK (stage IN ('cadrage', 'configuration_ia', 'formation_golive', 'suivi_adoption', 'bilan_conversion'));

ALTER TABLE onboarding_pipeline ALTER COLUMN stage SET DEFAULT 'cadrage';

-- ── 3. Seed réel — Chom Factory (Phase 2 en cours, Phase 1 complète) ───────
DO $$
DECLARE
  v_chom_id      UUID;
  v_africube_id  UUID;
  v_chom_org_id  UUID;
  v_afcb_org_id  UUID;
BEGIN
  -- Récupérer les org_id réels si disponibles
  SELECT id INTO v_chom_org_id  FROM organizations WHERE LOWER(name) LIKE '%chom%' LIMIT 1;
  SELECT id INTO v_afcb_org_id  FROM organizations WHERE LOWER(name) LIKE '%africube%' LIMIT 1;

  -- Chom Factory — Configuration & IA (phase 2)
  -- Phase 1 entièrement validée selon le fichier Excel (6/6 tâches)
  INSERT INTO onboarding_pipeline (
    org_id, org_name, country, stage, plan_target, assigned_to,
    notes, blocked, stage_entered_at, created_at
  )
  VALUES (
    v_chom_org_id,
    'Chom Factory',
    'Sénégal',
    'configuration_ia',
    'Growth',
    'john@bluwa.io',
    'Premier client pilote Dakar — Phase 1 entièrement validée (LOI signée, call cadrage effectué, modules validés). Fichiers Excel reçus, ingestion IA en cours.',
    false,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '14 days'
  )
  RETURNING id INTO v_chom_id;

  -- Checklist Phase 2 (5 tâches — tâche 1 déjà faite)
  INSERT INTO onboarding_checklist (pipeline_id, label, done, sort_order) VALUES
    (v_chom_id, 'Réception des fichiers Excel bruts de l''usine',          true,  1),
    (v_chom_id, 'Ingestion & traitement des fichiers via l''IA Bluwa',      false, 2),
    (v_chom_id, 'Validation de la cohérence des données injectées (QA)',    false, 3),
    (v_chom_id, 'Configuration de l''environnement cloud du site',          false, 4),
    (v_chom_id, 'Création des comptes utilisateurs & envoi des accès',      false, 5);

  -- Africube — À Cadrer (phase 1)
  -- Aucune tâche réalisée selon le fichier Excel (0/25)
  INSERT INTO onboarding_pipeline (
    org_id, org_name, country, stage, plan_target, assigned_to,
    notes, blocked, stage_entered_at, created_at
  )
  VALUES (
    v_afcb_org_id,
    'Africube',
    'Togo',
    'cadrage',
    'Growth',
    'john@bluwa.io',
    'Client pilote Adétikopé (Togo) — démarrage en cours. LOI à faire signer en priorité.',
    false,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
  RETURNING id INTO v_africube_id;

  -- Checklist Phase 1 (6 tâches — toutes à faire)
  INSERT INTO onboarding_checklist (pipeline_id, label, done, sort_order) VALUES
    (v_africube_id, 'Signature de la LOI et du NDA',                              false, 1),
    (v_africube_id, 'Envoi notification de lancement & fiche onboarding',         false, 2),
    (v_africube_id, 'Fixation de la date de démarrage officielle du pilote',      false, 3),
    (v_africube_id, 'Désignation du référent interne (Key User)',                  false, 4),
    (v_africube_id, 'Call de cadrage : isolation de 3 douleurs majeures',         false, 5),
    (v_africube_id, 'Validation des modules ERP prioritaires à activer',          false, 6);
END $$;
