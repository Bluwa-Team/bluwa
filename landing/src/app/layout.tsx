import type { ReactNode } from 'react'

// Root layout intentionally minimal — html/body/lang are in [locale]/layout.tsx
// so that each locale gets the correct lang attribute.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
