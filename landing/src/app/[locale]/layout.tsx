import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import '../globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Bluwa · Le copilote de croissance des agroalimentaires africains",
  description:
    "Pilotez votre marge en temps réel. Maîtrisez votre supply chain de bout en bout. Standards industriels mondiaux, interface ultra-simple, déployé en 15 jours.",
  openGraph: {
    title: "Bluwa · Le copilote de croissance des agroalimentaires africains",
    description:
      "Standards industriels mondiaux, interface ultra-simple. Déployé main dans la main avec votre terrain.",
    url: "https://bluwa.io",
    siteName: "Bluwa",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 400,
        alt: "Bluwa",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bluwa · Le copilote de croissance des agroalimentaires africains",
    description:
      "Standards industriels mondiaux, interface ultra-simple. Déployé en 15 jours.",
    images: ["/logo.png"],
  },
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
