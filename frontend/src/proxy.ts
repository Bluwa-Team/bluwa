import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isAuthPage = path === '/login' || path === '/signup'
  const isOnboarding = path === '/onboarding'
  const isAuthCallback = path.startsWith('/auth')
  const isPublicAsset = isAuthCallback

  // Non connecté
  if (!user) {
    if (isAuthPage || isPublicAsset) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Connecté : vérifier si profil existe
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  // Connecté SANS profil : doit faire l'onboarding
  if (!profile) {
    if (isOnboarding || isPublicAsset) return supabaseResponse
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Connecté AVEC profil : pas accès aux pages auth/onboarding
  if (isAuthPage || isOnboarding) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
