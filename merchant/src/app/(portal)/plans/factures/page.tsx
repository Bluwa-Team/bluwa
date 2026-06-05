import { getInvoices } from '@/lib/db'
import Link from 'next/link'
import { FacturesClient } from './FacturesClient'

export default async function FacturesPage() {
  const invoices = await getInvoices()
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/plans" className="hover:text-gray-600">Plans & Billing</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Factures SaaS</span>
      </div>
      <FacturesClient initialInvoices={invoices as any} />
    </div>
  )
}
