import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export const proxy = createIntlMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
