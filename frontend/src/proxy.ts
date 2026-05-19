import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isAuthCallback = path.startsWith('/auth')

  if (isAuthCallback) {
    return NextResponse.next()
  }

  const intlResponse = intlMiddleware(request)

  if (
    intlResponse.status === 307 ||
    intlResponse.status === 308 ||
    intlResponse.status === 302 ||
    intlResponse.status === 301
  ) {
    return intlResponse
  }

  const locales = routing.locales as readonly string[]
  const segments = path.split('/')
  const maybeLocale = segments[1]
  const localePath = locales.includes(maybeLocale)
    ? '/' + segments.slice(2).join('/')
    : path

  const isAuthPage = localePath === '/login' || localePath === '/signup'
  const isOnboarding = localePath === '/onboarding'

  let supabaseResponse = intlResponse

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
  const locale = locales.includes(maybeLocale) ? maybeLocale : routing.defaultLocale

  if (!user) {
    if (isAuthPage) return supabaseResponse
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    if (isOnboarding) return supabaseResponse
    return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url))
  }

  if (isAuthPage || isOnboarding) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
