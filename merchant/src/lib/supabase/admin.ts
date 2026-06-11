import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec clé service_role — bypass RLS complet.
 * Réservé aux Server Components du merchant portal (déjà protégés par le layout auth guard).
 * Ne jamais exposer côté client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
