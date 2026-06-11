import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Initialisation paresseuse : le client est créé au 1er appel, pas au module load.
// Cela évite un throw à la phase "collect page data" du build Next.js quand
// SUPABASE_SERVICE_ROLE_KEY n'est pas défini dans l'environnement.

let _client: ReturnType<typeof createClient<any, 'public', any>> | null = null

function getAdminClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Configuration Supabase serveur manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.',
    )
  }
  _client = createClient<any, 'public', any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _client
}

export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createClient<any, 'public', any>>,
  {
    get(_target, prop) {
      const inst = getAdminClient()
      const val = (inst as any)[prop]
      return typeof val === 'function' ? (val as Function).bind(inst) : val
    },
  },
)
