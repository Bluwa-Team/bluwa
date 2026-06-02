import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import '../globals.css'

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
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-b.png" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
