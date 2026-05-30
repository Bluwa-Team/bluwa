import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
})

export const metadata: Metadata = {
  title: 'Bluwa Academy · Formations agroalimentaires',
  description:
    'Maîtrisez vos opérations agroalimentaires avec les certifications Bluwa Academy. MDM, MRP2, HACCP, WM et CBSCP.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${figtree.variable} min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
