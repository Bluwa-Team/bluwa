-- ============================================================
-- Bluwa — Nettoyage des tables métier
-- À exécuter dans Supabase Studio > SQL Editor
--
-- Tables CONSERVÉES :
--   organizations, factories, profiles, user_site_access
--
-- Tables SUPPRIMÉES : toutes les tables métier ERP
-- ============================================================

-- Désactivation temporaire des FK pour simplifier l'ordre
SET session_replication_role = replica;

-- ── Tables de vente & livraison ────────────────────────────
DROP TABLE IF EXISTS sales_order_production_links CASCADE;
DROP TABLE IF EXISTS sales_order_items             CASCADE;
DROP TABLE IF EXISTS sales_orders                  CASCADE;
DROP TABLE IF EXISTS delivery_note_items           CASCADE;
DROP TABLE IF EXISTS delivery_notes                CASCADE;
DROP TABLE IF EXISTS customer_invoice_items        CASCADE;
DROP TABLE IF EXISTS customer_invoices             CASCADE;
DROP TABLE IF EXISTS grilles_tarifaires            CASCADE;
DROP TABLE IF EXISTS clients                       CASCADE;

-- ── Tables d'achat & réception ─────────────────────────────
DROP TABLE IF EXISTS vendor_invoice_items          CASCADE;
DROP TABLE IF EXISTS vendor_invoices               CASCADE;
DROP TABLE IF EXISTS suppliers_invoice_items       CASCADE;
DROP TABLE IF EXISTS suppliers_invoices            CASCADE;
DROP TABLE IF EXISTS invoices                      CASCADE;
DROP TABLE IF EXISTS goods_receipt_items           CASCADE;
DROP TABLE IF EXISTS goods_receipts                CASCADE;
DROP TABLE IF EXISTS purchase_order_items          CASCADE;
DROP TABLE IF EXISTS purchase_orders               CASCADE;
DROP TABLE IF EXISTS purchase_requisitions         CASCADE;
DROP TABLE IF EXISTS contrats_achat                CASCADE;
DROP TABLE IF EXISTS vendors                       CASCADE;
DROP TABLE IF EXISTS suppliers                     CASCADE;
DROP TABLE IF EXISTS fournisseurs                  CASCADE;

-- ── Tables de production & MRP ─────────────────────────────
DROP TABLE IF EXISTS production_outputs            CASCADE;
DROP TABLE IF EXISTS mrp_recommendations           CASCADE;
DROP TABLE IF EXISTS mrp_runs                      CASCADE;
DROP TABLE IF EXISTS production_orders             CASCADE;
DROP TABLE IF EXISTS routing_steps                 CASCADE;
DROP TABLE IF EXISTS routing_operations            CASCADE;
DROP TABLE IF EXISTS routing_headers               CASCADE;
DROP TABLE IF EXISTS bom_items                     CASCADE;
DROP TABLE IF EXISTS bom_headers                   CASCADE;
DROP TABLE IF EXISTS work_centers                  CASCADE;
DROP TABLE IF EXISTS service_orders                CASCADE;

-- ── Tables de stock & qualité ──────────────────────────────
DROP TABLE IF EXISTS quality_inspection_lots       CASCADE;
DROP TABLE IF EXISTS inventory_document_items      CASCADE;
DROP TABLE IF EXISTS inventory_documents           CASCADE;
DROP TABLE IF EXISTS stock_movements               CASCADE;
DROP TABLE IF EXISTS mouvements_stock              CASCADE;
DROP TABLE IF EXISTS article_stocks                CASCADE;
DROP TABLE IF EXISTS articles_stocks               CASCADE;
DROP TABLE IF EXISTS stocks                        CASCADE;
DROP TABLE IF EXISTS entrepots                     CASCADE;

-- ── Articles ───────────────────────────────────────────────
DROP TABLE IF EXISTS articles                      CASCADE;

-- ── Portail marchand & onboarding ─────────────────────────
DROP TABLE IF EXISTS onboarding_checklist          CASCADE;
DROP TABLE IF EXISTS onboarding_comments           CASCADE;
DROP TABLE IF EXISTS onboarding_pipeline           CASCADE;
DROP TABLE IF EXISTS installation_fees             CASCADE;
DROP TABLE IF EXISTS support_tickets               CASCADE;
DROP TABLE IF EXISTS subscription_plans            CASCADE;

-- Réactivation des FK
SET session_replication_role = DEFAULT;

-- ── Vérification ───────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
