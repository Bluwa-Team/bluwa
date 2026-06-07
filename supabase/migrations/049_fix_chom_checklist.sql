-- ============================================================
-- Migration 049 — Correctif checklist Chom Factory (Phase 2)
-- Problème : DB a 5 tâches (seed partiel), code attend 7
--            Tâches 3 & 4 manquantes, ordre 1-2 illogique
-- Fix : ordre logique (envoyer templates → recevoir fichiers)
--       + 7 tâches complètes
-- ============================================================

DO $$
DECLARE
  v_chom_pipeline_id UUID;
BEGIN
  -- Récupérer l'id pipeline de Chom Factory
  SELECT id INTO v_chom_pipeline_id
  FROM onboarding_pipeline
  WHERE org_name = 'Chom Factory'
  LIMIT 1;

  IF v_chom_pipeline_id IS NULL THEN
    RAISE NOTICE 'Chom Factory introuvable dans onboarding_pipeline — migration ignorée.';
    RETURN;
  END IF;

  -- Supprimer l'ancienne checklist
  DELETE FROM onboarding_checklist WHERE pipeline_id = v_chom_pipeline_id;

  -- Réinsérer dans le bon ordre (7 tâches)
  -- Tâche 1 marquée done = true (déjà envoyé les templates selon état réel)
  INSERT INTO onboarding_checklist (pipeline_id, label, done, sort_order) VALUES
    (v_chom_pipeline_id, 'Envoi des templates CSV au client (articles, clients, fournisseurs)', true,  1),
    (v_chom_pipeline_id, 'Réception des fichiers complétés & données brutes du client',        true,  2),
    (v_chom_pipeline_id, 'Import CSV ou saisie manuelle — articles & nomenclatures',           false, 3),
    (v_chom_pipeline_id, 'Import CSV ou saisie manuelle — fournisseurs & clients',             false, 4),
    (v_chom_pipeline_id, 'Validation de la cohérence des données importées (QA)',              false, 5),
    (v_chom_pipeline_id, 'Configuration de l''environnement cloud du site',                    false, 6),
    (v_chom_pipeline_id, 'Création des comptes utilisateurs & envoi des accès',                false, 7);

  -- Mettre à jour la note (supprimer référence ingestion IA)
  UPDATE onboarding_pipeline
  SET notes = 'Premier client pilote Dakar — Phase 1 entièrement validée (LOI signée, call cadrage effectué, modules validés). Templates CSV envoyés, fichiers reçus. Import en cours.'
  WHERE id = v_chom_pipeline_id;

END $$;
