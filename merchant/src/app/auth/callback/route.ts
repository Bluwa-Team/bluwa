import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const token = searchParams.get('token')
  const type  = searchParams.get('type')

  const supabase = await createClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token && type === 'magiclink') {
    await supabase.auth.verifyOtp({ token_hash: token, type: 'magiclink' })
  }

  return NextResponse.redirect(`${origin}/orgs`)
}
