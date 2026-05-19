import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws from 'ws'

dotenv.config()

const supabaseOptions = {
  realtime: { transport: ws as unknown as typeof WebSocket },
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  supabaseOptions
)

export function supabaseWithUserJWT(jwt: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      ...supabaseOptions,
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    }
  )
}
