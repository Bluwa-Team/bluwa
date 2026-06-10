-- ============================================================
-- Bluwa ERP — Baseline schéma public
-- Généré depuis la DB live Supabase — 10 juin 2026
-- Source : pg_dump --schema=public --schema-only
-- Remplace toutes les migrations 001-052
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: fn_handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_org_id UUID;
  v_role   TEXT;
BEGIN
  -- Lecture sécurisée de organization_id (ignore si absent ou invalide)
  BEGIN
    v_org_id := (NEW.raw_user_meta_data ->> 'organization_id')::UUID;
  EXCEPTION WHEN others THEN
    v_org_id := NULL;
  END;

  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'operator');

  -- N'insère dans profiles que si organization_id est disponible
  -- (invitation ou création manuelle). Les nouveaux utilisateurs OAuth
  -- passent par l'onboarding qui crée l'organisation et le profil.
  IF v_org_id IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, full_name, role)
    VALUES (
      NEW.id,
      v_org_id,
      COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_app_meta_data  ->> 'full_name',
        split_part(NEW.email, '@', 1)
      ),
      v_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_has_role_on_any_site(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_has_role_on_any_site(p_roles text[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   user_site_access usa
    JOIN   factories f ON f.id = usa.factory_id
    WHERE  usa.user_id       = auth.uid()
    AND    f.organization_id = fn_user_org()
    AND    usa.role          = ANY(p_roles)
  )
$$;


--
-- Name: fn_is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   user_site_access usa
    JOIN   factories f ON f.id = usa.factory_id
    WHERE  usa.user_id       = auth.uid()
    AND    f.organization_id = fn_user_org()
    AND    usa.role IN ('owner', 'admin')
  )
$$;


--
-- Name: fn_profile_org(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_profile_org() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


--
-- Name: fn_site_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_site_role(p_factory_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT role
  FROM   user_site_access
  WHERE  user_id    = auth.uid()
  AND    factory_id = p_factory_id
$$;


--
-- Name: fn_user_factories(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_user_factories() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT factory_id FROM user_site_access WHERE user_id = auth.uid()
$$;


--
-- Name: fn_user_org(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_user_org() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;


--
-- Name: get_my_org_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_org_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  -- Le profil sera créé manuellement via l'onboarding
  -- Ce trigger gère uniquement les invitations (metadata présentes)
  if new.raw_user_meta_data->>'organization_id' is not null then
    insert into profiles (id, organization_id, factory_id, role, full_name)
    values (
      new.id,
      (new.raw_user_meta_data->>'organization_id')::uuid,
      (new.raw_user_meta_data->>'factory_id')::uuid,
      new.raw_user_meta_data->>'role',
      new.raw_user_meta_data->>'full_name'
    );
  end if;
  return new;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: search_clients_for_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_clients_for_order(p_factory_id uuid, p_query text DEFAULT ''::text) RETURNS TABLE(id uuid, code text, raison_sociale text, ville text, pays text, est_lie boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    c.id, c.code, c.raison_sociale, c.ville, c.pays,
    EXISTS (
      SELECT 1 FROM client_factory_links cfl
      WHERE cfl.client_id = c.id AND cfl.factory_id = p_factory_id
    ) AS est_lie
  FROM clients c
  WHERE c.organization_id = fn_user_org()
    AND c.statut = 'Actif'
    AND (p_query = '' OR c.raison_sociale ILIKE '%' || p_query || '%' OR c.code ILIKE '%' || p_query || '%')
  ORDER BY est_lie DESC, c.raison_sociale
$$;


--
-- Name: search_fournisseurs_for_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_fournisseurs_for_order(p_factory_id uuid, p_query text DEFAULT ''::text) RETURNS TABLE(id uuid, code text, raison_sociale text, ville text, pays text, est_lie boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    f.id, f.code, f.raison_sociale, f.ville, f.pays,
    EXISTS (
      SELECT 1 FROM fournisseur_factory_links ffl
      WHERE ffl.fournisseur_id = f.id AND ffl.factory_id = p_factory_id
    ) AS est_lie
  FROM fournisseurs f
  WHERE f.organization_id = fn_user_org()
    AND f.statut = 'Actif'
    AND (p_query = '' OR f.raison_sociale ILIKE '%' || p_query || '%' OR f.code ILIKE '%' || p_query || '%')
  ORDER BY est_lie DESC, f.raison_sociale
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: article_factory_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_factory_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE article_factory_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.article_factory_links IS 'Territoire : quelles factories peuvent utiliser quel article';


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    code text NOT NULL,
    designation text NOT NULL,
    type text NOT NULL,
    statut text DEFAULT 'EnCreation'::text NOT NULL,
    famille text,
    sous_famille text,
    unite_stock text DEFAULT 'kg'::text NOT NULL,
    unite_vente text,
    coeff_conversion numeric DEFAULT 1,
    poids_unitaire numeric,
    volume_unitaire numeric,
    duree_vie integer,
    stock_securite numeric,
    point_commande numeric,
    appro text DEFAULT 'Achete'::text NOT NULL,
    gestion_lot boolean DEFAULT true NOT NULL,
    code_barres text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    categorie text,
    prix_vente numeric,
    dernier_prix_achat numeric,
    pmp numeric,
    delai_controle integer,
    seuil_alerte_peremption integer,
    protocole_controle text,
    qr_code text,
    devise text DEFAULT 'XOF'::text,
    poids_unite text DEFAULT 'kg'::text,
    volume_unite text DEFAULT 'L'::text,
    unite_achat text,
    coeff_conversion_achat numeric DEFAULT 1 NOT NULL,
    CONSTRAINT articles_appro_check CHECK ((appro = ANY (ARRAY['Achete'::text, 'Fabrique'::text]))),
    CONSTRAINT articles_coeff_conversion_achat_check CHECK ((coeff_conversion_achat > (0)::numeric)),
    CONSTRAINT articles_statut_check CHECK ((statut = ANY (ARRAY['Actif'::text, 'Bloque'::text, 'EnCreation'::text]))),
    CONSTRAINT articles_type_check CHECK ((type = ANY (ARRAY['MP'::text, 'PSF'::text, 'PF'::text, 'AC'::text, 'CS'::text])))
);


--
-- Name: COLUMN articles.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.type IS 'MP=Matière Première, PSF=Semi-fini, PF=Produit Fini, AC=Article Consommable, CS=Consommable';


--
-- Name: COLUMN articles.duree_vie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.duree_vie IS 'Durée de vie en jours — utilisée pour le calcul DLC des lots';


--
-- Name: COLUMN articles.appro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.appro IS 'Achete=appro externe, Fabrique=produit en interne (OF)';


--
-- Name: COLUMN articles.poids_unite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.poids_unite IS 'Unité du poids unitaire (kg, g, t…)';


--
-- Name: COLUMN articles.volume_unite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.volume_unite IS 'Unité du volume unitaire (L, mL, m³…)';


--
-- Name: COLUMN articles.unite_achat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.unite_achat IS 'Unité utilisée dans BC et réception (ex : boite, sac 50 kg). NULL si article fabriqué (PF/PSF).';


--
-- Name: COLUMN articles.coeff_conversion_achat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.articles.coeff_conversion_achat IS 'Nb unités stock par unité achat. Ex : 3552 si 1 boite = 3552 g. DEFAULT 1 = pas de conversion.';


--
-- Name: bom_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    article_id uuid NOT NULL,
    version text DEFAULT 'v1.0'::text NOT NULL,
    version_name text,
    batch_size numeric DEFAULT 1 NOT NULL,
    base_quantity numeric DEFAULT 1 NOT NULL,
    batch_unit text DEFAULT 'kg'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE bom_headers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bom_headers IS 'En-tête de nomenclature — une seule active par article';


--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    bom_header_id uuid NOT NULL,
    component_id uuid NOT NULL,
    component_label text,
    item_position integer DEFAULT 1 NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'kg'::text NOT NULL,
    tolerance_pct numeric DEFAULT 0 NOT NULL,
    scrap_pct numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE bom_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bom_items IS 'Composants / ingrédients de la nomenclature';


--
-- Name: client_factory_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_factory_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE client_factory_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.client_factory_links IS 'Territoire : quelles factories gèrent quel client';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    code text NOT NULL,
    raison_sociale text NOT NULL,
    statut text DEFAULT 'Actif'::text NOT NULL,
    type text,
    contact_principal text,
    telephone text,
    email text,
    ville text,
    pays text,
    condition_paiement text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    secteur text,
    langue text DEFAULT 'Français'::text,
    incoterm text,
    transport text,
    limite_credit numeric,
    paiement_mobile boolean DEFAULT false NOT NULL,
    devise text DEFAULT 'XOF'::text,
    CONSTRAINT clients_statut_check CHECK ((statut = ANY (ARRAY['Actif'::text, 'Inactif'::text]))),
    CONSTRAINT clients_type_check CHECK ((type = ANY (ARRAY['Grossiste'::text, 'Detaillant'::text, 'Institutionnel'::text, 'ONG'::text, 'Export'::text, 'Autre'::text])))
);


--
-- Name: factories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(20) NOT NULL,
    country character varying(100) NOT NULL,
    city character varying(100),
    timezone character varying(60) DEFAULT 'Africa/Dakar'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    location_country text,
    location_city text,
    currency text DEFAULT 'XOF'::text NOT NULL,
    subscription_plan_id uuid,
    subscription_status text,
    subscription_expires_at timestamp with time zone,
    site_type character varying(30) DEFAULT 'usine'::character varying NOT NULL,
    is_owned boolean DEFAULT true NOT NULL,
    CONSTRAINT factories_site_type_check CHECK (((site_type)::text = ANY ((ARRAY['usine'::character varying, 'entrepot'::character varying, 'depot_vente'::character varying, 'centre_distribution'::character varying, '3pl'::character varying, '4pl'::character varying])::text[]))),
    CONSTRAINT factories_subscription_status_check CHECK ((subscription_status = ANY (ARRAY['ACTIVE'::text, 'PAST_DUE'::text, 'CANCELED'::text])))
);


--
-- Name: TABLE factories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.factories IS 'Sites de production — sectorise toutes les données opérationnelles';


--
-- Name: COLUMN factories.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.factories.code IS 'Code court du site (ex. DAK = Dakar, LOM = Lomé)';


--
-- Name: COLUMN factories.site_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.factories.site_type IS 'Nature du site : usine propre, entrepôt, 3PL externe, etc.';


--
-- Name: COLUMN factories.is_owned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.factories.is_owned IS 'TRUE = site appartenant à l''org / FALSE = prestataire externe';


--
-- Name: fournisseur_factory_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fournisseur_factory_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fournisseur_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE fournisseur_factory_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fournisseur_factory_links IS 'Territoire : quelles factories travaillent avec quel fournisseur';


--
-- Name: fournisseurs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fournisseurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    code text NOT NULL,
    raison_sociale text NOT NULL,
    statut text DEFAULT 'Formel'::text NOT NULL,
    qualification text DEFAULT 'AQualifier'::text NOT NULL,
    categorie text,
    devise text DEFAULT 'XOF'::text NOT NULL,
    contact_principal text,
    telephone text,
    email text,
    ville text,
    pays text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mode_logistique text,
    paiement_mobile boolean DEFAULT false NOT NULL,
    score_fiabilite numeric,
    CONSTRAINT fournisseurs_qualification_check CHECK ((qualification = ANY (ARRAY['Agree'::text, 'AQualifier'::text, 'Suspendu'::text]))),
    CONSTRAINT fournisseurs_statut_check CHECK ((statut = ANY (ARRAY['Formel'::text, 'Informel'::text])))
);


--
-- Name: grilles_tarifaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grilles_tarifaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    article_code text NOT NULL,
    designation text,
    prix_negocie numeric NOT NULL,
    devise text DEFAULT 'XOF'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE grilles_tarifaires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.grilles_tarifaires IS 'Prix de vente négociés par client et par article (PF/PSF)';


--
-- Name: installation_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factory_id uuid NOT NULL,
    size text NOT NULL,
    amount_xof numeric(15,2) NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT installation_fees_size_check CHECK ((size = ANY (ARRAY['tpe'::text, 'pme'::text, 'grande'::text]))),
    CONSTRAINT installation_fees_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factory_id uuid NOT NULL,
    amount_xof numeric(15,2) NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    due_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: onboarding_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_checklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pipeline_id uuid NOT NULL,
    label text NOT NULL,
    done boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pipeline_id uuid NOT NULL,
    author text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onboarding_pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_pipeline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    org_name text NOT NULL,
    country text,
    stage text DEFAULT 'cadrage'::text NOT NULL,
    plan_target text,
    assigned_to text,
    notes text,
    blocked boolean DEFAULT false NOT NULL,
    blocked_reason text,
    stage_entered_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT onboarding_pipeline_stage_check CHECK ((stage = ANY (ARRAY['cadrage'::text, 'configuration_ia'::text, 'formation_golive'::text, 'suivi_adoption'::text, 'bilan_conversion'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(100) NOT NULL,
    plan character varying(20) DEFAULT 'starter'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    country_headquarters text,
    status text DEFAULT 'active'::text NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    crm_plan_id uuid,
    CONSTRAINT organizations_plan_check CHECK (((plan)::text = ANY ((ARRAY['starter'::character varying, 'growth'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trial'::text, 'suspended'::text, 'churned'::text, 'archived'::text])))
);


--
-- Name: TABLE organizations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.organizations IS 'Tenants SaaS — une ligne par entreprise cliente Bluwa';


--
-- Name: COLUMN organizations.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.slug IS 'Identifiant URL unique, ex : bluwa-dakar';


--
-- Name: COLUMN organizations.crm_plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.crm_plan_id IS 'Plan CRM souscrit au niveau organisation (équipe commerciale transverse, indépendant des factories)';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    full_name character varying(200),
    role character varying(30) DEFAULT 'operator'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cgu_accepted_at timestamp with time zone,
    cgu_version text,
    CONSTRAINT profiles_role_check CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying, 'operator'::character varying, 'viewer'::character varying])::text[])))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'Extension de auth.users — lie un utilisateur Supabase à un tenant';


--
-- Name: COLUMN profiles.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.role IS 'owner > admin > manager > operator > viewer';


--
-- Name: referentiel_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referentiel_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    kind text NOT NULL,
    value text NOT NULL,
    parent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referentiel_values_kind_check CHECK ((kind = ANY (ARRAY['article_famille'::text, 'article_sous_famille'::text, 'article_categorie'::text, 'unite_stock'::text, 'unite_mesure'::text])))
);


--
-- Name: TABLE referentiel_values; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.referentiel_values IS 'Valeurs de référentiel enrichies par l''utilisateur (familles, unités, catégories)';


--
-- Name: COLUMN referentiel_values.kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.referentiel_values.kind IS 'Type : article_famille | article_sous_famille | article_categorie | unite_stock | unite_mesure';


--
-- Name: COLUMN referentiel_values.parent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.referentiel_values.parent IS 'Valeur parente pour les hiérarchies (sous_famille→famille, categorie→sous_famille)';


--
-- Name: routing_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routing_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    article_id uuid NOT NULL,
    version text DEFAULT 'v1.0'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE routing_headers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.routing_headers IS 'En-tête de gamme de fabrication — une seule active par article';


--
-- Name: routing_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routing_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    routing_header_id uuid NOT NULL,
    work_center_id uuid,
    step_order integer DEFAULT 1 NOT NULL,
    operation text NOT NULL,
    duration_min numeric DEFAULT 0 NOT NULL,
    setup_time_minutes numeric DEFAULT 0 NOT NULL,
    run_time_minutes_per_unit numeric DEFAULT 0 NOT NULL,
    temperature_c numeric,
    equipment text,
    control_point text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE routing_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.routing_steps IS 'Étapes de la gamme de fabrication';


--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    factory_id uuid,
    service_type text NOT NULL,
    description text NOT NULL,
    amount_xof numeric(15,2) NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    status text DEFAULT 'quoted'::text NOT NULL,
    scheduled_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_orders_service_type_check CHECK ((service_type = ANY (ARRAY['formation'::text, 'support_prioritaire'::text, 'audit_conseil'::text, 'migration_donnees'::text]))),
    CONSTRAINT service_orders_status_check CHECK ((status = ANY (ARRAY['quoted'::text, 'confirmed'::text, 'delivered'::text, 'invoiced'::text, 'paid'::text])))
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price_monthly numeric(15,2) NOT NULL,
    price_monthly_annual numeric(15,2) DEFAULT 0 NOT NULL,
    max_users_allowed integer DEFAULT 5 NOT NULL,
    target_size text DEFAULT 'tpe'::text NOT NULL,
    features_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    product character varying(20) DEFAULT 'erp'::character varying NOT NULL,
    CONSTRAINT subscription_plans_product_check CHECK (((product)::text = ANY ((ARRAY['erp'::character varying, 'wms'::character varying, 'crm'::character varying])::text[]))),
    CONSTRAINT subscription_plans_target_size_check CHECK ((target_size = ANY (ARRAY['tpe'::text, 'pme'::text, 'grande'::text])))
);


--
-- Name: COLUMN subscription_plans.product; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscription_plans.product IS 'Produit Bluwa auquel appartient ce plan : erp | wms | crm';


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    assigned_to text,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    factory_id uuid NOT NULL,
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: user_site_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_site_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'operator'::text NOT NULL,
    CONSTRAINT user_site_access_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'operator'::text, 'viewer'::text])))
);


--
-- Name: TABLE user_site_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_site_access IS 'Pivot accès multi-sites : UNIQUE(user_id, factory_id) empêche les doublons';


--
-- Name: COLUMN user_site_access.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_site_access.role IS 'Rôle de l''utilisateur sur ce site (owner > admin > manager > operator > viewer)';


--
-- Name: work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    factory_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    daily_capacity_hours numeric(4,2) DEFAULT 8.00 NOT NULL,
    efficiency_percentage numeric(5,2) DEFAULT 100.00 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rate_per_hour numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    CONSTRAINT work_centers_efficiency_percentage_check CHECK (((efficiency_percentage >= (0)::numeric) AND (efficiency_percentage <= (100)::numeric)))
);


--
-- Name: TABLE work_centers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_centers IS 'Postes de travail / lignes de production — capacité industrielle par site';


--
-- Name: COLUMN work_centers.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_centers.code IS 'Code court du poste, ex: CUVE-01, LIGNE-EMB';


--
-- Name: COLUMN work_centers.daily_capacity_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_centers.daily_capacity_hours IS 'Nombre d''heures d''ouverture par jour';


--
-- Name: COLUMN work_centers.efficiency_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_centers.efficiency_percentage IS 'Facteur de performance TRS théorique (0–100)';


--
-- Name: COLUMN work_centers.rate_per_hour; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_centers.rate_per_hour IS 'Coût horaire du poste (MOD + amortissement)';


--
-- Name: COLUMN work_centers.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_centers.currency IS 'Devise du taux horaire (XOF par défaut)';


--
-- Name: article_factory_links article_factory_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_factory_links
    ADD CONSTRAINT article_factory_links_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: bom_headers bom_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_headers
    ADD CONSTRAINT bom_headers_pkey PRIMARY KEY (id);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: client_factory_links client_factory_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_factory_links
    ADD CONSTRAINT client_factory_links_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: factories factories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_pkey PRIMARY KEY (id);


--
-- Name: fournisseur_factory_links fournisseur_factory_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseur_factory_links
    ADD CONSTRAINT fournisseur_factory_links_pkey PRIMARY KEY (id);


--
-- Name: fournisseurs fournisseurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_pkey PRIMARY KEY (id);


--
-- Name: grilles_tarifaires grilles_tarifaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grilles_tarifaires
    ADD CONSTRAINT grilles_tarifaires_pkey PRIMARY KEY (id);


--
-- Name: installation_fees installation_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_fees
    ADD CONSTRAINT installation_fees_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: onboarding_checklist onboarding_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_pkey PRIMARY KEY (id);


--
-- Name: onboarding_comments onboarding_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_comments
    ADD CONSTRAINT onboarding_comments_pkey PRIMARY KEY (id);


--
-- Name: onboarding_pipeline onboarding_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_pipeline
    ADD CONSTRAINT onboarding_pipeline_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: referentiel_values referentiel_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referentiel_values
    ADD CONSTRAINT referentiel_values_pkey PRIMARY KEY (id);


--
-- Name: routing_headers routing_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_headers
    ADD CONSTRAINT routing_headers_pkey PRIMARY KEY (id);


--
-- Name: routing_steps routing_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_steps
    ADD CONSTRAINT routing_steps_pkey PRIMARY KEY (id);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_name_key UNIQUE (name);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: articles uq_article_code_per_org; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT uq_article_code_per_org UNIQUE (organization_id, code);


--
-- Name: article_factory_links uq_article_factory; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_factory_links
    ADD CONSTRAINT uq_article_factory UNIQUE (article_id, factory_id);


--
-- Name: clients uq_client_code_per_org; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT uq_client_code_per_org UNIQUE (organization_id, code);


--
-- Name: client_factory_links uq_client_factory; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_factory_links
    ADD CONSTRAINT uq_client_factory UNIQUE (client_id, factory_id);


--
-- Name: factories uq_factory_code_per_org; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT uq_factory_code_per_org UNIQUE (organization_id, code);


--
-- Name: fournisseurs uq_fournisseur_code_per_org; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT uq_fournisseur_code_per_org UNIQUE (organization_id, code);


--
-- Name: fournisseur_factory_links uq_fournisseur_factory; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseur_factory_links
    ADD CONSTRAINT uq_fournisseur_factory UNIQUE (fournisseur_id, factory_id);


--
-- Name: grilles_tarifaires uq_grille_client_article; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grilles_tarifaires
    ADD CONSTRAINT uq_grille_client_article UNIQUE (client_id, article_code);


--
-- Name: referentiel_values uq_referentiel_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referentiel_values
    ADD CONSTRAINT uq_referentiel_value UNIQUE (organization_id, kind, value, parent);


--
-- Name: user_site_access uq_user_factory; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_site_access
    ADD CONSTRAINT uq_user_factory UNIQUE (user_id, factory_id);


--
-- Name: work_centers uq_work_center_code_per_factory; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT uq_work_center_code_per_factory UNIQUE (factory_id, code);


--
-- Name: user_site_access user_site_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_site_access
    ADD CONSTRAINT user_site_access_pkey PRIMARY KEY (id);


--
-- Name: work_centers work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_pkey PRIMARY KEY (id);


--
-- Name: idx_afl_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_afl_article ON public.article_factory_links USING btree (article_id);


--
-- Name: idx_afl_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_afl_factory ON public.article_factory_links USING btree (factory_id);


--
-- Name: idx_articles_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_org ON public.articles USING btree (organization_id);


--
-- Name: idx_articles_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_statut ON public.articles USING btree (statut);


--
-- Name: idx_articles_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_type ON public.articles USING btree (type);


--
-- Name: idx_bom_headers_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_headers_article ON public.bom_headers USING btree (article_id);


--
-- Name: idx_bom_headers_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_headers_org ON public.bom_headers USING btree (organization_id);


--
-- Name: idx_bom_items_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_component ON public.bom_items USING btree (component_id);


--
-- Name: idx_bom_items_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_header ON public.bom_items USING btree (bom_header_id);


--
-- Name: idx_cfl_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cfl_client ON public.client_factory_links USING btree (client_id);


--
-- Name: idx_cfl_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cfl_factory ON public.client_factory_links USING btree (factory_id);


--
-- Name: idx_checklist_pipeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_pipeline ON public.onboarding_checklist USING btree (pipeline_id);


--
-- Name: idx_clients_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_org ON public.clients USING btree (organization_id);


--
-- Name: idx_comments_pipeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_pipeline ON public.onboarding_comments USING btree (pipeline_id);


--
-- Name: idx_ffl_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ffl_factory ON public.fournisseur_factory_links USING btree (factory_id);


--
-- Name: idx_ffl_fournisseur; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ffl_fournisseur ON public.fournisseur_factory_links USING btree (fournisseur_id);


--
-- Name: idx_fournisseurs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fournisseurs_org ON public.fournisseurs USING btree (organization_id);


--
-- Name: idx_grilles_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grilles_client ON public.grilles_tarifaires USING btree (client_id);


--
-- Name: idx_install_fees_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_install_fees_factory ON public.installation_fees USING btree (factory_id);


--
-- Name: idx_invoices_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_factory ON public.invoices USING btree (factory_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_pipeline_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_stage ON public.onboarding_pipeline USING btree (stage);


--
-- Name: idx_referentiel_org_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referentiel_org_kind ON public.referentiel_values USING btree (organization_id, kind);


--
-- Name: idx_routing_headers_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routing_headers_article ON public.routing_headers USING btree (article_id);


--
-- Name: idx_routing_headers_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routing_headers_org ON public.routing_headers USING btree (organization_id);


--
-- Name: idx_routing_steps_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routing_steps_header ON public.routing_steps USING btree (routing_header_id);


--
-- Name: idx_routing_steps_work_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routing_steps_work_center ON public.routing_steps USING btree (work_center_id);


--
-- Name: idx_service_orders_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_orders_org ON public.service_orders USING btree (org_id);


--
-- Name: idx_tickets_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_factory ON public.support_tickets USING btree (factory_id);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_work_centers_factory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_centers_factory ON public.work_centers USING btree (factory_id);


--
-- Name: idx_work_centers_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_centers_org ON public.work_centers USING btree (organization_id);


--
-- Name: articles trg_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: bom_headers trg_bom_headers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bom_headers_updated_at BEFORE UPDATE ON public.bom_headers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: clients trg_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: fournisseurs trg_fournisseurs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fournisseurs_updated_at BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: grilles_tarifaires trg_grilles_tarifaires_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grilles_tarifaires_updated_at BEFORE UPDATE ON public.grilles_tarifaires FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: routing_headers trg_routing_headers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_routing_headers_updated_at BEFORE UPDATE ON public.routing_headers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: work_centers trg_work_centers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_work_centers_updated_at BEFORE UPDATE ON public.work_centers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: article_factory_links article_factory_links_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_factory_links
    ADD CONSTRAINT article_factory_links_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_factory_links article_factory_links_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_factory_links
    ADD CONSTRAINT article_factory_links_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: articles articles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bom_headers bom_headers_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_headers
    ADD CONSTRAINT bom_headers_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: bom_headers bom_headers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_headers
    ADD CONSTRAINT bom_headers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_bom_header_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_header_id_fkey FOREIGN KEY (bom_header_id) REFERENCES public.bom_headers(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.articles(id) ON DELETE RESTRICT;


--
-- Name: bom_items bom_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: client_factory_links client_factory_links_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_factory_links
    ADD CONSTRAINT client_factory_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_factory_links client_factory_links_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_factory_links
    ADD CONSTRAINT client_factory_links_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: clients clients_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: factories factories_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: factories factories_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;


--
-- Name: fournisseur_factory_links fournisseur_factory_links_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseur_factory_links
    ADD CONSTRAINT fournisseur_factory_links_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: fournisseur_factory_links fournisseur_factory_links_fournisseur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseur_factory_links
    ADD CONSTRAINT fournisseur_factory_links_fournisseur_id_fkey FOREIGN KEY (fournisseur_id) REFERENCES public.fournisseurs(id) ON DELETE CASCADE;


--
-- Name: fournisseurs fournisseurs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: grilles_tarifaires grilles_tarifaires_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grilles_tarifaires
    ADD CONSTRAINT grilles_tarifaires_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: installation_fees installation_fees_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_fees
    ADD CONSTRAINT installation_fees_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: onboarding_checklist onboarding_checklist_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.onboarding_pipeline(id) ON DELETE CASCADE;


--
-- Name: onboarding_comments onboarding_comments_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_comments
    ADD CONSTRAINT onboarding_comments_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.onboarding_pipeline(id) ON DELETE CASCADE;


--
-- Name: onboarding_pipeline onboarding_pipeline_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_pipeline
    ADD CONSTRAINT onboarding_pipeline_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: organizations organizations_crm_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_crm_plan_id_fkey FOREIGN KEY (crm_plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: referentiel_values referentiel_values_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referentiel_values
    ADD CONSTRAINT referentiel_values_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: routing_headers routing_headers_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_headers
    ADD CONSTRAINT routing_headers_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: routing_headers routing_headers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_headers
    ADD CONSTRAINT routing_headers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: routing_steps routing_steps_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_steps
    ADD CONSTRAINT routing_steps_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: routing_steps routing_steps_routing_header_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_steps
    ADD CONSTRAINT routing_steps_routing_header_id_fkey FOREIGN KEY (routing_header_id) REFERENCES public.routing_headers(id) ON DELETE CASCADE;


--
-- Name: routing_steps routing_steps_work_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_steps
    ADD CONSTRAINT routing_steps_work_center_id_fkey FOREIGN KEY (work_center_id) REFERENCES public.work_centers(id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: user_site_access user_site_access_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_site_access
    ADD CONSTRAINT user_site_access_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: user_site_access user_site_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_site_access
    ADD CONSTRAINT user_site_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: work_centers work_centers_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- Name: work_centers work_centers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: article_factory_links afl_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY afl_admin ON public.article_factory_links USING (public.fn_is_admin());


--
-- Name: article_factory_links afl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY afl_select ON public.article_factory_links FOR SELECT USING (((factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)) OR public.fn_is_admin()));


--
-- Name: article_factory_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_factory_links ENABLE ROW LEVEL SECURITY;

--
-- Name: articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

--
-- Name: articles articles_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY articles_delete ON public.articles FOR DELETE USING (((organization_id = public.fn_user_org()) AND public.fn_is_admin()));


--
-- Name: articles articles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY articles_insert ON public.articles FOR INSERT WITH CHECK (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: articles articles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY articles_select ON public.articles FOR SELECT USING (((organization_id = public.fn_user_org()) AND (public.fn_is_admin() OR (id IN ( SELECT article_factory_links.article_id
   FROM public.article_factory_links
  WHERE (article_factory_links.factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)))))));


--
-- Name: articles articles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY articles_update ON public.articles FOR UPDATE USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: bom_headers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bom_headers ENABLE ROW LEVEL SECURITY;

--
-- Name: bom_headers bom_headers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bom_headers_select ON public.bom_headers FOR SELECT USING ((organization_id = public.fn_user_org()));


--
-- Name: bom_headers bom_headers_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bom_headers_write ON public.bom_headers USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: bom_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

--
-- Name: bom_items bom_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bom_items_select ON public.bom_items FOR SELECT USING ((organization_id = public.fn_user_org()));


--
-- Name: bom_items bom_items_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bom_items_write ON public.bom_items USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: client_factory_links cfl_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cfl_admin ON public.client_factory_links USING (public.fn_is_admin());


--
-- Name: client_factory_links cfl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cfl_select ON public.client_factory_links FOR SELECT USING (((factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)) OR public.fn_is_admin()));


--
-- Name: onboarding_checklist checklist_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_admin ON public.onboarding_checklist USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: client_factory_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_factory_links ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: clients clients_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_delete ON public.clients FOR DELETE USING (((organization_id = public.fn_user_org()) AND public.fn_is_admin()));


--
-- Name: clients clients_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_insert ON public.clients FOR INSERT WITH CHECK (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: clients clients_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_select ON public.clients FOR SELECT USING (((organization_id = public.fn_user_org()) AND (public.fn_is_admin() OR (id IN ( SELECT client_factory_links.client_id
   FROM public.client_factory_links
  WHERE (client_factory_links.factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)))))));


--
-- Name: clients clients_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clients_update ON public.clients FOR UPDATE USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: onboarding_comments comments_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_admin ON public.onboarding_comments USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: factories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

--
-- Name: factories factories_bluwa_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY factories_bluwa_admin ON public.factories USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: factories factories_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY factories_insert_admin ON public.factories FOR INSERT WITH CHECK (((organization_id = ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))));


--
-- Name: factories factories_select_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY factories_select_own_org ON public.factories FOR SELECT USING ((organization_id = ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: factories factories_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY factories_update_admin ON public.factories FOR UPDATE USING (((organization_id = ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))));


--
-- Name: fournisseur_factory_links ffl_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ffl_admin ON public.fournisseur_factory_links USING (public.fn_is_admin());


--
-- Name: fournisseur_factory_links ffl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ffl_select ON public.fournisseur_factory_links FOR SELECT USING (((factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)) OR public.fn_is_admin()));


--
-- Name: fournisseur_factory_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fournisseur_factory_links ENABLE ROW LEVEL SECURITY;

--
-- Name: fournisseurs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

--
-- Name: fournisseurs fournisseurs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fournisseurs_delete ON public.fournisseurs FOR DELETE USING (((organization_id = public.fn_user_org()) AND public.fn_is_admin()));


--
-- Name: fournisseurs fournisseurs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fournisseurs_insert ON public.fournisseurs FOR INSERT WITH CHECK (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: fournisseurs fournisseurs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fournisseurs_select ON public.fournisseurs FOR SELECT USING (((organization_id = public.fn_user_org()) AND (public.fn_is_admin() OR (id IN ( SELECT fournisseur_factory_links.fournisseur_id
   FROM public.fournisseur_factory_links
  WHERE (fournisseur_factory_links.factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)))))));


--
-- Name: fournisseurs fournisseurs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fournisseurs_update ON public.fournisseurs FOR UPDATE USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: grilles_tarifaires grilles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grilles_select ON public.grilles_tarifaires FOR SELECT USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.organization_id = public.fn_user_org()))));


--
-- Name: grilles_tarifaires; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grilles_tarifaires ENABLE ROW LEVEL SECURITY;

--
-- Name: grilles_tarifaires grilles_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grilles_write ON public.grilles_tarifaires USING (((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.organization_id = public.fn_user_org()))) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: installation_fees install_fees_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY install_fees_admin ON public.installation_fees USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: installation_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installation_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_admin ON public.invoices USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: onboarding_checklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_pipeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_pipeline ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations orgs_bluwa_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orgs_bluwa_admin ON public.organizations USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: organizations orgs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orgs_select_own ON public.organizations FOR SELECT USING ((id = ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: onboarding_pipeline pipeline_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pipeline_admin ON public.onboarding_pipeline USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_bluwa_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_bluwa_admin ON public.profiles USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((id = auth.uid()));


--
-- Name: referentiel_values referentiel_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY referentiel_select ON public.referentiel_values FOR SELECT USING ((organization_id = public.fn_user_org()));


--
-- Name: referentiel_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referentiel_values ENABLE ROW LEVEL SECURITY;

--
-- Name: referentiel_values referentiel_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY referentiel_write ON public.referentiel_values USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: routing_headers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routing_headers ENABLE ROW LEVEL SECURITY;

--
-- Name: routing_headers routing_headers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY routing_headers_select ON public.routing_headers FOR SELECT USING ((organization_id = public.fn_user_org()));


--
-- Name: routing_headers routing_headers_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY routing_headers_write ON public.routing_headers USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: routing_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routing_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: routing_steps routing_steps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY routing_steps_select ON public.routing_steps FOR SELECT USING ((organization_id = public.fn_user_org()));


--
-- Name: routing_steps routing_steps_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY routing_steps_write ON public.routing_steps USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: service_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: service_orders service_orders_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_orders_admin ON public.service_orders USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: subscription_plans sp_bluwa_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_bluwa_admin ON public.subscription_plans USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: subscription_plans sp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_select ON public.subscription_plans FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets tickets_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_admin ON public.support_tickets USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: user_site_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_site_access ENABLE ROW LEVEL SECURITY;

--
-- Name: user_site_access user_site_access_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_site_access_admin ON public.user_site_access USING (public.fn_is_admin());


--
-- Name: user_site_access user_site_access_bluwa_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_site_access_bluwa_admin ON public.user_site_access USING ((auth.email() ~~ '%@bluwa.io'::text));


--
-- Name: user_site_access user_site_access_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_site_access_select ON public.user_site_access FOR SELECT USING (((user_id = auth.uid()) OR public.fn_is_admin()));


--
-- Name: work_centers wc_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wc_delete ON public.work_centers FOR DELETE USING (((organization_id = public.fn_user_org()) AND public.fn_is_admin()));


--
-- Name: work_centers wc_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wc_insert ON public.work_centers FOR INSERT WITH CHECK (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: work_centers wc_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wc_select ON public.work_centers FOR SELECT USING (((organization_id = public.fn_user_org()) AND (public.fn_is_admin() OR (factory_id IN ( SELECT public.fn_user_factories() AS fn_user_factories)))));


--
-- Name: work_centers wc_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wc_update ON public.work_centers FOR UPDATE USING (((organization_id = public.fn_user_org()) AND ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying])::text[]))));


--
-- Name: work_centers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_centers ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


